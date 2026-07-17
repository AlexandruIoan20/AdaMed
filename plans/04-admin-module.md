# Plan de implementare: Modul de Administrare (Admin)

> Status: Draft — neimplementat
> Stack: Quarkus (backend) · React 19 + Vite (frontend) · PostgreSQL
> Depinde de: [01-auth-module.md](./01-auth-module.md) (roluri + JWT), [02-quiz-module.md](./02-quiz-module.md) (entități grile), [03-quiz-modes-and-randomization.md](./03-quiz-modes-and-randomization.md) (R2 + imagini)

## 1. Obiectiv

Un panou de **administrare** accesibil doar utilizatorilor cu rol `ADMIN`, dintr-un tab separat. De acolo administratorul poate:

1. **Useri** — listă cu **paginare**; poate edita **doar `username` și `role`** (nu și restul datelor).
2. **Facultăți** — vizualizare, creare, editare, ștergere.
3. **Materii per facultate** — pentru fiecare facultate vede materiile asociate (cu an de studiu / credite); poate adăuga / edita / dezlega materii.
4. **Grile per (facultate, materie)** — grilele aparțin perechii facultate-materie (`faculty_subjects`), nu materiei globale; adminul vede grilele cu **toate răspunsurile** și marcajul **corect / greșit**, plus **imaginile**.
5. **Creare conținut** — creează facultăți / materii / grile (inclusiv cu imagini, încărcate în R2) și editează orice câmp al unei facultăți / materii / grile / răspuns.

**Toate listările** (useri, facultăți, materii per facultate, grile per materie, catalog de materii) sunt **paginate server-side** — vezi §2.4.

**Ștergerile sunt în cascadă** (nu blocante): ștergerea unei entități șterge automat și entitățile dependente — vezi §2.5. Pe frontend, înainte de execuție, se afișează un **card de confirmare** cu detaliile exacte ale a ceea ce va fi șters.

**Nu** implementăm acum partea de **statistici**.

La final, modulul trebuie să fie complet și funcțional (backend + frontend + autorizare pe rol).

## 2. Decizii structurale cheie

### 2.1 Autorizare prin rol, nu doar autentificare

Token-ul JWT conține deja rolul ca *group* (`TokenService` → `.groups(user.getRole().name())`). Prin urmare, protejarea endpoint-urilor de admin se face declarativ cu **`@RolesAllowed("ADMIN")`** (auth proactiv e deja activ: `quarkus.http.auth.proactive=true`). Nu e nevoie de logică custom de verificare a rolului în servicii.

Pe frontend, rolul e deja expus în tipul `User` (`role: UserRole`) prin `/api/auth/me`, deci putem face un **guard de rută** și afișa tab-ul de admin condiționat.

### 2.2 DTO-uri de admin separate de cele de quiz (expun `isCorrect`)

DTO-urile din modulul de quiz **ascund** intenționat `isCorrect` (vezi [02 §3.5](./02-quiz-module.md)). Adminul are nevoie de exact opusul: vede care răspuns e corect. Deci introducem **DTO-uri noi în `ro.platformamedicala.dto.admin`** care **includ** `isCorrect`, `position`, `explanation`, imaginile etc. Nu reutilizăm `QuestionDTO`/`AnswerOptionDTO`.

### 2.3 Modelul de date: `Subject` global, dar **grile per `FacultySubject`** (modificare de schemă)

**Cerință cheie (decizie):** o materie poate exista la mai multe facultăți, **dar grilele NU sunt globale** — fiecare facultate își face propriile grile. Schema inițială lega grila direct de materia globală (`questions.subject_id → subjects`), ceea ce ar fi partajat grilele între toate facultățile care au acea materie. **Acest lucru se schimbă** (vezi §4 pentru schema + aplicare):

- O **materie** (`subjects`) rămâne **globală** (nume unic) — e doar catalogul de nume/descrieri și poate aparține mai multor facultăți.
- Legătura facultate↔materie se face prin **`faculty_subjects`** (entitatea „materia X la facultatea Y"), care poartă `year_of_study` și `credits`. Se adaugă `UNIQUE(faculty_id, subject_id)` ca perechea să fie bine definită.
- O **grilă** (`questions`) este legată de **`FacultySubject`** (`faculty_subject_id`), **nu** de `Subject`. Astfel grilele aparțin perechii (facultate, materie): fiecare facultate are setul ei de grile, chiar dacă partajează numele materiei cu altă facultate.
- `quiz_sessions` se leagă tot de **`faculty_subject_id`** (o sesiune e a unui user pe materia *de la facultatea lui*).

Consecințe pentru admin:
- „Adaugă materie la facultate" = creează/alege un `Subject` (catalog) **+** creează un rând `FacultySubject` (cu an + credite). Grilele se adaugă **ulterior** pe acel `FacultySubject`.
- „Dezleagă materie de facultate" = șterge rândul `FacultySubject`; pentru că grilele atârnă de el, **se șterg și grilele facultății pentru acea materie** (cascadă — vezi §2.5). Materia globală (`Subject`) și grilele altor facultăți **rămân**.
- „Editează materia" (nume/descriere) se face pe `Subject` (afectează toate facultățile care o folosesc); „editează an/credite" se face pe `FacultySubject`.
- **Refolosirea** unei materii la altă facultate (decizia §8.4) e acum inofensivă: se partajează doar numele/descrierea, **nu** și grilele.

### 2.4 Paginare (peste tot)

**Toate listările sunt paginate server-side** cu Panache (`find(...).page(Page.of(index, size))`). Răspuns standardizat `PageDTO<T>` (`content`, `page`, `size`, `totalElements`, `totalPages`) pentru:

- useri (`GET /api/admin/users`),
- facultăți (`GET /api/admin/faculties`),
- materii per facultate (`GET /api/admin/faculties/{id}/subjects`),
- catalogul global de materii (`GET /api/admin/subjects`),
- grile per (facultate, materie) (`GET /api/admin/faculty-subjects/{id}/questions`).

Toate acceptă `?page=0&size=20` (cu valori default rezonabile, ex. `size=20`) și, unde are sens, un parametru `search` opțional. Pe frontend, fiecare listă are controale prev/next + indicator de pagină (și opțional mărime pagină). `AdminFacultyDetailDTO` rămâne fără listă inline de materii — materiile facultății se aduc paginat prin endpoint-ul dedicat.

### 2.5 Reguli de ștergere (cascadă)

**Regula adoptată: ștergere în cascadă.** Ștergerea unei entități șterge automat și tot ce depinde de ea, fără blocare cu `409`. Cascada se execută **programatic, într-o tranzcție** (`@Transactional`) în servicii, ca să putem (a) curăța și **fișierele din R2** și (b) acoperi tabelele care nu au `ON DELETE CASCADE` în schemă (`user_answers`, `user_question_bookmarks`, `ai_explanations`, `quiz_sessions`). Nu modificăm schema `init.sql`.

Lanțurile de ștergere:

- **Ștergere grilă** (`questions`):
  1. încarcă cheile imaginilor (`question_images.image_key` + eventualul `answers.image_url`/`questions.image_url` legacy) și apelează `R2StorageService.delete(key)` pentru fiecare;
  2. șterge rândurile dependente fără cascadă DB: `user_answers` (după `question_id`), `user_question_bookmarks`, `ai_explanations`;
  3. șterge grila — `answers` și `question_images` dispar automat prin `ON DELETE CASCADE` (deja în schemă).

- **Dezlegare materie de facultate** (`faculty_subjects` — „detach"), acum **ștergere reală cu cascadă** (grilele atârnă de legătură):
  1. pentru fiecare grilă a legăturii (`questions.faculty_subject_id = id`), execută lanțul „Ștergere grilă" de mai sus (inclusiv R2);
  2. tratează `quiz_sessions.faculty_subject_id` al legăturii (setează `NULL` sau șterge — vezi nota de mai jos);
  3. șterge rândul `faculty_subjects`. Materia globală (`Subject`) și grilele altor facultăți **rămân**.

- **Ștergere materie** (`subjects`) — *cascadă completă, cum ai cerut*:
  1. pentru fiecare `faculty_subjects` care referă materia, execută lanțul „Dezlegare materie de facultate" de mai sus (care șterge grilele fiecărei facultăți + R2 + sesiunile);
  2. șterge materia (`subjects`).

- **Ștergere facultate** (`faculties`):
  1. pentru fiecare `faculty_subjects` al facultății, execută lanțul „Dezlegare materie de facultate" (șterge grilele facultății + R2 + sesiunile); **materiile globale rămân**, nu se șterg;
  2. `users.faculty_id` este `NOT NULL` și nu putem rămâne cu useri „orfani". Ștergerea unei facultăți cu useri asociați **rămâne blocată cu `409`** (singura excepție de la cascadă), pentru că ștergerea conturilor de utilizator ca efect secundar e prea distructivă și e în afara scopului acestui modul. UI-ul afișează în card câți useri o referă.

> Notă `quiz_sessions`: o sesiune e legată de un user + (opțional) un `faculty_subject`. La ștergerea grilelor unei legături, varianta recomandată e **`SET faculty_subject_id = NULL`** pe sesiunile afectate (păstrăm istoricul de sesiuni), nu ștergerea lor. Implementarea poate alege și ștergerea sesiunilor dacă se preferă curățarea completă — de decis la implementare, ambele sunt acceptabile.

> Atenție R2: rândurile din `question_images` dispar prin cascadă DB, dar **fișierele din bucket rămân orfane** dacă nu sunt șterse explicit. De aceea pasul de curățare R2 e **primul** în orice lanț care șterge grile (grilă, materie).

> Confirmare în UI (obligatoriu): orice ștergere declanșează întâi un **card de confirmare** care descrie concret impactul — câte grile, câte legături `faculty_subjects`, câte imagini R2, câți useri afectați etc. — și cere acordul explicit înainte de a apela `DELETE`. Vezi §5.6.

### 2.6 Refolosirea upload-ului de imagini (R2)

Endpoint-urile de imagini există deja (`QuestionImageResource`: `POST/GET/DELETE /api/questions/{id}/images`). Le **refolosim**, dar **mutăm scrierea sub `@RolesAllowed("ADMIN")`** (acum sunt doar `@Authenticated`). Adminul atașează imagini la o grilă existentă; fluxul „creează grilă apoi încarcă imagini" se face în doi pași din UI.

## 3. Backend (Quarkus)

Pachete noi: `ro.platformamedicala.dto.admin`, `ro.platformamedicala.service.admin`. Resurse noi în `ro.platformamedicala.resource`.

### 3.1 Securitate

- Toate resursele de admin: adnotare la nivel de clasă **`@RolesAllowed("ADMIN")`**.
- `QuestionImageResource`: `upload` și `delete` devin `@RolesAllowed("ADMIN")`; `list` poate rămâne `@Authenticated` (sau tot ADMIN — neutilizat în quiz).
- Helper opțional `requireUuid`/validări la intrare; 404 când entitatea nu există, 409 la conflict FK, 400 la payload invalid.

### 3.2 DTO-uri (`ro.platformamedicala.dto.admin`)

Generic:
- **`PageDTO<T>`**: `List<T> content; int page; int size; long totalElements; int totalPages;` + factory din `(List<T>, page, size, total)`.

Useri:
- **`AdminUserDTO`**: `id, username, firstName, lastName, email, emailVerified, facultyId, facultyName, yearOfStudy, role, createdAt`.
- **`UpdateUserRequestDTO`**: doar `username` (`@NotBlank`, length ≤ 30) și `role` (`UserRole`, `@NotNull`). **Orice alt câmp e ignorat** la nivel de serviciu.

Facultăți:
- **`AdminFacultyDTO`**: `id, name, description, subjectCount, userCount`.
- **`AdminFacultyDetailDTO`**: `id, name, description, subjects: List<AdminFacultySubjectDTO>`.
- **`FacultyRequestDTO`**: `name` (`@NotBlank`, ≤100), `description` (≤500).

Materii:
- **`AdminSubjectDTO`**: `id, name, description, facultyCount` (în câte facultăți e folosită materia globală). *Notă: nu mai există un `questionCount` global pe materie, fiindcă grilele atârnă de `faculty_subjects`, nu de `Subject`.*
- **`AdminFacultySubjectDTO`**: `facultySubjectId, subjectId, name, description, yearOfStudy, credits, questionCount` (grilele acestei perechi facultate-materie).
- **`SubjectRequestDTO`**: `name` (`@NotBlank`, ≤100), `description` (≤255).
- **`AttachSubjectRequestDTO`**: `subjectId` (opțional — materie existentă) **sau** `newSubject: SubjectRequestDTO`, plus `yearOfStudy`, `credits`.
- **`FacultySubjectRequestDTO`**: `yearOfStudy`, `credits` (pentru editarea legăturii).

Grile + răspunsuri (expun corectitudinea):
- **`AdminAnswerDTO`**: `id, text, imageUrl, isCorrect, position`.
- **`AdminQuestionDTO`**: `id, facultySubjectId, text, explanation, imageUrl (legacy), images: List<QuestionImageDTO>, answers: List<AdminAnswerDTO>, createdAt`.
- **`AnswerRequestDTO`**: `id (nullable — null = răspuns nou), text (@NotBlank), imageUrl?, isCorrect (@NotNull), position`.
- **`QuestionRequestDTO`**: `text (@NotBlank), explanation?, answers: List<AnswerRequestDTO>` (cu validare: minim 2 răspunsuri, minim 1 corect).

### 3.3 Servicii (`ro.platformamedicala.service.admin`)

- **`AdminUserService`**: `list(page, size, search)` → `PageDTO<AdminUserDTO>` (Panache `find(...).page(...)`, căutare opțională pe `username/email`); `updateUser(id, dto)` → setează **doar** `username` + `role` (verifică unicitatea `username`).
- **`AdminFacultyService`**: `list(page, size, search)` → `PageDTO<AdminFacultyDTO>`; `get/create/update`. La `delete` (`@Transactional`): șterge în cascadă rândurile `faculty_subjects` ale facultății (materiile globale rămân); **blochează cu 409 doar dacă există `users` care referă facultatea** (vezi §2.5).
- **`AdminSubjectService`**:
  - CRUD pe `Subject` (`create/update`); `list(page, size, search)` → `PageDTO<AdminSubjectDTO>` (catalog global).
  - `delete(subjectId)` (`@Transactional`): **cascadă completă** — pentru fiecare `faculty_subjects` al materiei rulează `detach(...)` (care șterge grilele acelei facultăți + fișiere R2 + `user_answers`/`bookmarks`/`ai_explanations` + tratează `quiz_sessions`), apoi șterge materia (vezi §2.5).
  - `listForFaculty(facultyId, page, size)` → `PageDTO<AdminFacultySubjectDTO>` (join pe `faculty_subjects`).
  - `attachToFaculty(facultyId, dto)` → creează `Subject` (dacă `newSubject`) **sau** refolosește un `Subject` existent din catalog (`subjectId`) + creează `FacultySubject` (respectă `UNIQUE(faculty_id, subject_id)` → 409 dacă deja legată).
  - `updateLink(facultySubjectId, dto)`.
  - `detach(facultySubjectId)` (`@Transactional`): **ștergere cu cascadă** — pentru fiecare grilă a legăturii rulează lanțul „Ștergere grilă" (R2 + dependențe), tratează `quiz_sessions.faculty_subject_id`, apoi șterge rândul `faculty_subjects` (vezi §2.5).
- **`AdminQuestionService`**:
  - `listForFacultySubject(facultySubjectId, page, size)` → `PageDTO<AdminQuestionDTO>` (cu răspunsuri + imagini).
  - `get(questionId)`.
  - `create(facultySubjectId, dto)` → persistă `Question` (legat de `FacultySubject`) + `Answer`-uri.
  - `update(questionId, dto)` → sincronizează răspunsurile (vezi mai jos).
  - `delete(questionId)` (`@Transactional`) → lanțul „Ștergere grilă" din §2.5: șterge fișierele R2, apoi `user_answers`/`bookmarks`/`ai_explanations`, apoi grila (cascadă DB pe `answers`/`question_images`).

**Sincronizarea răspunsurilor la `update`** (decizie §8.2, confirmată): răspunsurile cu `id` existent se **editează pe loc** (păstrăm id-ul, ca să nu rupem `user_answers`); cele cu `id = null` se **adaugă**; cele lipsă din payload se **șterg doar dacă nu sunt referite** în `user_answers` (altfel 409 cu mesaj clar). Asta evită coruperea istoricului de răspunsuri. (Notă: aceasta e o regulă la nivel de *editare a unei grile*, distinctă de ștergerea în cascadă a unei grile/materii întregi din §2.5, unde `user_answers` se șterg odată cu grila.)

### 3.4 Resources (endpoint-uri REST)

Toate sub `@RolesAllowed("ADMIN")`. Prefix `/api/admin`.

**Useri** — `AdminUserResource` (`/api/admin/users`):
- `GET /?page=0&size=20&search=` → `PageDTO<AdminUserDTO>`
- `PATCH /{id}` (`UpdateUserRequestDTO`) → `AdminUserDTO`

**Facultăți** — `AdminFacultyResource` (`/api/admin/faculties`):
- `GET /?page=0&size=20&search=` → `PageDTO<AdminFacultyDTO>`
- `GET /{id}` → `AdminFacultyDetailDTO`
- `POST /` (`FacultyRequestDTO`) → `AdminFacultyDTO`
- `PUT /{id}` (`FacultyRequestDTO`) → `AdminFacultyDTO`
- `DELETE /{id}` → 204 (cascadă pe `faculty_subjects`) / 409 (dacă are useri asociați)
- `GET /{facultyId}/subjects?page=0&size=20` → `PageDTO<AdminFacultySubjectDTO>`
- `POST /{facultyId}/subjects` (`AttachSubjectRequestDTO`) → `AdminFacultySubjectDTO`

**Materii** — `AdminSubjectResource` (`/api/admin/subjects`):
- `GET /?page=0&size=20&search=` → `PageDTO<AdminSubjectDTO>` (catalog global, pentru atașare)
- `POST /` (`SubjectRequestDTO`) → `AdminSubjectDTO`
- `PUT /{id}` (`SubjectRequestDTO`) → `AdminSubjectDTO`
- `DELETE /{id}` → 204 (**cascadă completă**: toate legăturile `faculty_subjects` + grilele lor + răspunsuri + imagini R2)

**Legături facultate-materie** — `AdminFacultySubjectResource` (`/api/admin/faculty-subjects`):
- `PUT /{id}` (`FacultySubjectRequestDTO`) → `AdminFacultySubjectDTO`
- `DELETE /{id}` → 204 (dezleagă materia de facultate; **cascadă pe grilele acelei perechi** + R2; materia globală rămâne)
- `GET /{facultySubjectId}/questions?page=0&size=20` → `PageDTO<AdminQuestionDTO>`
- `POST /{facultySubjectId}/questions` (`QuestionRequestDTO`) → `AdminQuestionDTO`

**Grile** — `AdminQuestionResource` (`/api/admin/questions`):
- `GET /{id}` → `AdminQuestionDTO`
- `PUT /{id}` (`QuestionRequestDTO`) → `AdminQuestionDTO`
- `DELETE /{id}` → 204 (cascadă pe răspunsuri/imagini + șterge fișierele R2)

**Imagini** — `QuestionImageResource` existent, cu scrierea mutată pe `@RolesAllowed("ADMIN")`.

### 3.5 Validări

- Unicitate `username` (user), `name` (facultate, materie) — verificare în serviciu + mesaj 409 prietenos (nu doar excepția de constrângere).
- Grilă: minim 2 răspunsuri, minim 1 corect, `position` consecutive (sau normalizate la salvare).
- `role` ∈ {USER, ADMIN}.
- Upload imagini: păstrăm limita 5MB + whitelist content-type (deja implementate în `QuestionImageResource`).

## 4. Bază de date

### 4.1 Modificare de schemă necesară (prerechizită): grile per `faculty_subject`

Schema inițială lega grila de materia globală (`questions.subject_id → subjects`), ceea ce ar partaja grilele între toate facultățile cu acea materie. Cerința e ca **fiecare facultate să-și aibă propriile grile** (§2.3), deci grila trebuie să atârne de `faculty_subjects`. Modificări în `database/init.sql`:

```sql
-- 1. perechea (facultate, materie) bine definită
ALTER TABLE faculty_subjects ADD CONSTRAINT uq_faculty_subject UNIQUE (faculty_id, subject_id);

-- 2. grila atârnă de faculty_subjects, nu de subjects
--    (în definiția tabelului questions: înlocuiește
--     subject_id UUID NOT NULL REFERENCES subjects(id)
--     cu)
faculty_subject_id UUID NOT NULL REFERENCES faculty_subjects(id)

-- 3. o sesiune e a unui user pe materia de la facultatea lui
--    (în quiz_sessions: subject_id → faculty_subject_id REFERENCES faculty_subjects(id))
faculty_subject_id UUID REFERENCES faculty_subjects(id)
```

Seed-ul din `init.sql` (grilele de test) trebuie ajustat să lege grilele de `faculty_subjects`, nu de `subjects`.

**Cum se aplică (cel mai ușor):** proiectul rulează `init.sql` la inițializarea containerului, fără migrații (Flyway/Liquibase). În dev, editezi `init.sql` și **recreezi volumul** Postgres (`docker compose down -v && docker compose up`), care rerulează scriptul curat — fără script de migrare. (Dacă ar exista date reale de păstrat: `ALTER TABLE` + backfill din `faculty_subjects`, dar nu e cazul pe seed de dezvoltare.)

> Impact pe alte module (în afara acestui plan, dar de reținut): modulul de quiz (02/03) și entitățile Java `Question` / `QuizSession`, plus query-urile care filtrează pe `subject_id`, trebuie actualizate să folosească `faculty_subject_id` (la start de sesiune se rezolvă materia → `faculty_subject` al facultății userului). `user_answers`, `user_question_bookmarks`, `ai_explanations` referă `question_id` și **nu** se schimbă.

### 4.2 Restul

În rest, **fără alte modificări de schemă** — modulul e CRUD peste tabelele existente (`users`, `faculties`, `subjects`, `faculty_subjects`, `questions`, `answers`, `question_images`). Ștergerea în cascadă (§2.5) se face **programatic în servicii** (`@Transactional`), nu prin `ON DELETE CASCADE` adăugat în schemă.

**Fără seed de cont admin.** Nu se creează niciun cont de administrator în `init.sql` sau script separat. (Promovarea unui user la `ADMIN` se face direct în baza de date / prin alt mecanism, în afara scopului acestui plan.)

Opțional (recomandat la volume mari, pentru paginare):
- Index pentru căutarea/paginarea userilor: `CREATE INDEX idx_users_username ON users(username);` (email are deja unique → index implicit).

## 5. Frontend (React + Vite)

Arhitectură orizontală (pe tip de fișier), ca în [01 §4.2](./01-auth-module.md).

### 5.1 `service/api.ts` — extindere

Azi `api` are doar `get` și `post`. Adăugăm:
- `put<T>(path, body)`, `patch<T>(path, body)`, `del<T>(path)` — pe modelul lui `post` (JSON, `credentials: "include"`).
- `postForm<T>(path, formData: FormData)` — **fără** `Content-Type` manual (browserul pune `multipart/form-data` + boundary), pentru upload de imagini.

### 5.2 Guard de rol + tab de admin

- **`AdminRoute`** (component nou): ca `ProtectedRoute`, dar și `if (user.role !== "ADMIN") return <Navigate to="/subjects" replace />`.
- **`Sidebar`**: item nou „Administrare" (`/admin`) afișat **doar** dacă `user?.role === "ADMIN"`.

### 5.3 Rute (în `App.tsx`, sub `AdminRoute` + `AppLayout`)

```
/admin                      -> AdminDashboardPage (carduri: Useri / Facultăți)
/admin/users                -> AdminUsersPage (tabel paginat + editare)
/admin/faculties            -> AdminFacultiesPage (listă + creare/editare/ștergere)
/admin/faculties/:facultyId            -> AdminFacultyDetailPage (materiile facultății)
/admin/faculty-subjects/:facultySubjectId -> AdminSubjectQuestionsPage (grilele acelei perechi facultate-materie)
/admin/questions/new                   -> AdminQuestionEditorPage (creare; facultySubjectId din query)
/admin/questions/:questionId           -> AdminQuestionEditorPage (editare + imagini)
```

### 5.4 Servicii + tipuri

- **`types/admin.types.ts`**: `PageResult<T>`, `AdminUser`, `AdminFaculty`, `AdminFacultyDetail`, `AdminSubject`, `AdminFacultySubject`, `AdminQuestion`, `AdminAnswer`, plus tipurile de request.
- **`service/admin.service.ts`**: funcții pentru toate endpoint-urile de mai sus (useri, facultăți, materii, legături, grile, imagini).

### 5.5 Pagini

- **`AdminDashboardPage`** — puncte de intrare (Useri, Facultăți). Fără statistici.
- **`AdminUsersPage`** — tabel **paginat** (controale prev/next + mărime pagină), căutare opțională; buton „Editează" → modal cu **doar** `username` + `role` (dropdown). Restul câmpurilor afișate read-only.
- **`AdminFacultiesPage`** — listă **paginată** de facultăți; creare/editare prin modal/formular; ștergere prin **card de confirmare** (§5.6) — la facultate cu useri asociați se afișează 409 prietenos.
- **`AdminFacultyDetailPage`** — materiile facultății **paginate** (an/credite/nr. grile *ale acestei facultăți*); „Adaugă materie" (alege din catalog **sau** creează nouă, cu an+credite); editare legătură; dezlegare (cu card de confirmare — șterge grilele facultății pentru acea materie). Click pe materie → grilele ei (`/admin/faculty-subjects/:facultySubjectId`).
- **`AdminSubjectQuestionsPage`** — lista **paginată** a grilelor perechii (facultate, materie), fiecare cu răspunsurile colorate **corect (verde) / greșit**, miniaturi imagini; „Adaugă grilă" (creează pe `facultySubjectId`); editare/ștergere (cu card de confirmare).
- **`AdminQuestionEditorPage`** — formular grilă: `text`, `explanation`, listă de răspunsuri (text + checkbox „corect" + ordine + imagine opțională), validare client (≥2 răspunsuri, ≥1 corect). După **salvarea** grilei (avem `questionId`), secțiune de **upload imagini** (folosește `postForm` → `/api/questions/{id}/images`), cu listă + ștergere.

### 5.6 UX / detalii

- Toate paginile de admin folosesc același shell ca restul app-ului (`AppLayout` + sidebar), cu un breadcrumb facultate → materie → grilă.
- Erorile de server (404/409/400) se mapează la mesaje clare (ex. „Numele facultății există deja").
- Afișarea corect/greșit: verde pentru `isCorrect`, neutru altfel (e zonă de admin, deci se vede deschis — spre deosebire de quiz).
- Toate listele au controale de **paginare** (prev/next + indicator pagină; opțional mărime pagină) legate de `PageResult<T>`.
- **Card de confirmare la ștergere (obligatoriu, decizie §8.1).** Orice acțiune distructivă deschide un card/modal de confirmare care descrie **concret** ce urmează să se șteargă, înainte de a apela `DELETE`:
  - **Materie (din catalog)**: „Vei șterge materia «X» din catalog. Se vor șterge automat: M legături cu facultăți și toate grilele lor (N grile în total, cu răspunsurile și imaginile din R2), din toate facultățile. Acțiunea este ireversibilă."
  - **Dezlegare materie de facultate**: „Vei dezlega «X» de facultatea «Y». Se vor șterge cele N grile ale acestei facultăți pentru materie (+ răspunsuri și imagini R2). Materia rămâne în catalog și la celelalte facultăți."
  - **Grilă**: „Vei șterge grila și cele K răspunsuri + I imagini."
  - **Facultate**: „Vei șterge facultatea «X» și cele M legături cu materii, împreună cu grilele lor (materiile din catalog rămân). Dacă există useri asociați, ștergerea va fi blocată."
  - Numerele (N grile, M legături, imagini, useri) se afișează din câmpurile de count deja prezente în DTO-uri (`questionCount`, `subjectCount`, `userCount`, `facultyCount`) sau dintr-un mic preview cerut la deschiderea cardului. Confirmarea cere acțiune explicită (buton „Șterg definitiv").

## 6. Pași de implementare (ordine recomandată)

0. **Schema (prerechizită, §4.1)**: în `init.sql` mută `questions.subject_id → faculty_subject_id`, adaugă `UNIQUE(faculty_id, subject_id)` pe `faculty_subjects`, mută `quiz_sessions.subject_id → faculty_subject_id`, ajustează seed-ul; recreează volumul Postgres. Actualizează entitățile Java `Question`/`QuizSession` și codul din modulul quiz care filtra pe `subject_id`.
1. **Backend — securitate**: mută scrierea imaginilor pe `@RolesAllowed("ADMIN")`; confirmă că `@RolesAllowed("ADMIN")` funcționează (token are deja `groups`).
2. **Backend — DTO-uri admin** (`dto.admin`), inclusiv `PageDTO<T>`.
3. **Backend — useri**: `AdminUserService` + `AdminUserResource` (listă paginată + PATCH username/role).
4. **Backend — facultăți**: serviciu + resource (CRUD + listă paginată + delete cu cascadă pe `faculty_subjects` / 409 pe useri).
5. **Backend — materii + legături**: `AdminSubjectService` + `AdminSubjectResource` + `AdminFacultySubjectResource` (liste paginate + delete cascadă completă pe materie).
6. **Backend — grile**: `AdminQuestionService` + `AdminQuestionResource` (CRUD + listă paginată + sincronizare răspunsuri + ștergere cascadă cu fișiere R2 + `user_answers`/bookmarks/ai_explanations).
7. **Backend — (opțional)** index useri pentru paginare. (Fără seed admin — vezi §4.)
8. **Backend — teste** (RestAssured): acces interzis fără rol ADMIN (403), paginare pe toate listele, PATCH respinge câmpuri în afară de username/role, **ștergere în cascadă** a materiei (grile + legături dispar), facultate cu useri → 409, creare grilă cu validări, upload imagine doar admin.
9. **Frontend — `api.ts`**: `put/patch/del/postForm`.
10. **Frontend — guard + tab**: `AdminRoute`, item „Administrare" condiționat de rol.
11. **Frontend — tipuri + `admin.service.ts`**.
12. **Frontend — pagini**: Dashboard → Users (paginat) → Faculties → FacultyDetail (materii) → SubjectQuestions → QuestionEditor (cu imagini).
13. **Test manual end-to-end**: ca admin, creează facultate → materie (atașată cu an/credite) → grilă cu răspunsuri + imagine; verifică în quiz (ca user) că grila și imaginea apar; editează username+rol al unui user; testează ștergerile în cascadă (cu card de confirmare): șterge o materie și confirmă că grilele + legăturile + fișierele R2 dispar; încearcă să ștergi o facultate cu useri → 409 prietenos.

## 7. Definirea „gata" (Definition of Done)

- Tab-ul „Administrare" apare **doar** la useri `ADMIN`; rutele `/admin/*` sunt blocate altora (frontend) și endpoint-urile `/api/admin/*` întorc **403** fără rol ADMIN (backend).
- **Toate listele paginate**: useri, facultăți, materii per facultate, catalog materii, grile per materie — `PageDTO`/`PageResult` + controale prev/next.
- **Useri**: editare limitată strict la `username` + `role` (restul ignorat server-side).
- **Facultăți / materii / grile / răspunsuri**: creare + editare completă; **ștergere în cascadă** (materie → grile + imagini R2 + legături; grilă → răspunsuri + imagini; facultate → legături, blocată doar dacă are useri), precedată de **card de confirmare** cu detaliile impactului.
- **Grile per facultate**: schema modificată (`questions.faculty_subject_id`) — fiecare facultate are propriile grile, chiar dacă partajează numele materiei cu altă facultate.
- **Materii per facultate**: vizualizare cu an/credite; atașare (din catalog sau nouă) + dezlegare (care șterge grilele facultății pentru acea materie, dar **nu** materia globală).
- **Grile per (facultate, materie)**: se văd toate răspunsurile cu marcaj **corect/greșit** + imaginile.
- **Imagini**: adminul poate încărca/șterge imagini pe grile (R2); la ștergerea grilei, fișierele R2 nu rămân orfane.
- Fără secțiune de statistici (amânată).

## 8. Decizii (rezolvate)

1. ~~Ștergere defensivă (409) vs. cascadă~~ → **DECIS: ștergere în cascadă** (vezi §2.5). Ștergerea materiei șterge automat legăturile `faculty_subjects` și toate grilele (+ răspunsuri/imagini/R2). Singura excepție: ștergerea unei facultăți cu **useri** asociați rămâne blocată cu 409. UI-ul arată un **card de confirmare** cu detaliile acțiunii înainte de execuție (§5.6).
2. ~~Editarea răspunsurilor referite în `user_answers`~~ → **DECIS: facem așa** — păstrăm id-urile (editare pe loc), iar ștergerea unui răspuns referit în `user_answers` (în cadrul *editării* unei grile) e blocată cu 409 (§3.3).
3. ~~Seed cont admin~~ → **DECIS: nu se creează niciun cont de admin** (nici în `init.sql`, nici prin script) — vezi §4.
4. ~~Catalog global de materii~~ → **DECIS: da, cu reutilizare** — la atașarea unei materii la o facultate, UI-ul permite atât alegerea unei materii existente din catalogul global, cât și crearea uneia noi (§2.3, §3.3, §5.5). Reutilizarea partajează **doar** numele/descrierea materiei, nu și grilele (vezi punctul 6).
5. ~~Paginare doar la useri~~ → **DECIS: paginare peste tot** (§2.4) — useri, facultăți, materii per facultate, catalog materii, grile per (facultate, materie).
6. **Grile per facultate (nou)** → **DECIS: schimbare de schemă** — grilele atârnă de `faculty_subjects` (`questions.faculty_subject_id`), nu de materia globală, ca fiecare facultate să-și aibă propriile grile. Vezi §2.3 și §4.1.
