# Plan de implementare: Modul de Administrare (Admin)

> Status: Draft — neimplementat
> Stack: Quarkus (backend) · React 19 + Vite (frontend) · PostgreSQL
> Depinde de: [01-auth-module.md](./01-auth-module.md) (roluri + JWT), [02-quiz-module.md](./02-quiz-module.md) (entități grile), [03-quiz-modes-and-randomization.md](./03-quiz-modes-and-randomization.md) (R2 + imagini)

## 1. Obiectiv

Un panou de **administrare** accesibil doar utilizatorilor cu rol `ADMIN`, dintr-un tab separat. De acolo administratorul poate:

1. **Useri** — listă cu **paginare**; poate edita **doar `username` și `role`** (nu și restul datelor).
2. **Facultăți** — vizualizare, creare, editare, ștergere.
3. **Materii per facultate** — pentru fiecare facultate vede materiile asociate (cu an de studiu / credite); poate adăuga / edita / dezlega materii.
4. **Grile per materie** — pentru fiecare materie vede grilele cu **toate răspunsurile** și marcajul **corect / greșit**, plus **imaginile**.
5. **Creare conținut** — creează facultăți / materii / grile (inclusiv cu imagini, încărcate în R2) și editează orice câmp al unei facultăți / materii / grile / răspuns.

**Nu** implementăm acum partea de **statistici**.

La final, modulul trebuie să fie complet și funcțional (backend + frontend + autorizare pe rol).

## 2. Decizii structurale cheie

### 2.1 Autorizare prin rol, nu doar autentificare

Token-ul JWT conține deja rolul ca *group* (`TokenService` → `.groups(user.getRole().name())`). Prin urmare, protejarea endpoint-urilor de admin se face declarativ cu **`@RolesAllowed("ADMIN")`** (auth proactiv e deja activ: `quarkus.http.auth.proactive=true`). Nu e nevoie de logică custom de verificare a rolului în servicii.

Pe frontend, rolul e deja expus în tipul `User` (`role: UserRole`) prin `/api/auth/me`, deci putem face un **guard de rută** și afișa tab-ul de admin condiționat.

### 2.2 DTO-uri de admin separate de cele de quiz (expun `isCorrect`)

DTO-urile din modulul de quiz **ascund** intenționat `isCorrect` (vezi [02 §3.5](./02-quiz-module.md)). Adminul are nevoie de exact opusul: vede care răspuns e corect. Deci introducem **DTO-uri noi în `ro.platformamedicala.dto.admin`** care **includ** `isCorrect`, `position`, `explanation`, imaginile etc. Nu reutilizăm `QuestionDTO`/`AnswerOptionDTO`.

### 2.3 Modelul de date: `Subject` global vs. `FacultySubject` (legătură cu an/credite)

Din schema existentă:
- O **materie** (`subjects`) e **globală** (nume unic) și poate aparține mai multor facultăți.
- Legătura facultate↔materie se face prin **`faculty_subjects`**, care poartă `year_of_study` și `credits`.
- O **grilă** (`questions`) e legată **direct de `Subject`** (`subject_id`), nu de `FacultySubject`. Deci grilele unei materii sunt comune tuturor facultăților care au acea materie.

Consecințe pentru admin:
- „Adaugă materie la facultate" = creează/alege un `Subject` **+** creează un rând `FacultySubject` (cu an + credite).
- „Dezleagă materie de facultate" = șterge rândul `FacultySubject` (materia globală **rămâne**).
- „Editează materia" (nume/descriere) se face pe `Subject`; „editează an/credite" se face pe `FacultySubject`.

### 2.4 Paginare (doar la useri)

Lista de useri poate fi mare → **paginare server-side** cu Panache (`Page.of(index, size)`). Răspuns standardizat `PageDTO<T>` (`content`, `page`, `size`, `totalElements`, `totalPages`). Facultățile/materiile/grilele se afișează ca liste simple (volume mici), fără paginare în prima versiune.

### 2.5 Reguli de ștergere (constrângeri FK)

Din `init.sql`:
- `answers` și `question_images` au **`ON DELETE CASCADE`** pe `question_id` → ștergerea unei grile șterge automat răspunsurile + imaginile (dar **nu** și obiectele din R2 — vezi mai jos).
- `questions.subject_id`, `faculty_subjects.faculty_id/subject_id`, `users.faculty_id` **nu** au cascadă → ștergerea unei materii cu grile, a unei facultăți cu useri/legături etc. va da eroare FK.

**Regula adoptată: ștergere defensivă, cu blocare explicită.** Înainte de delete, serviciul verifică dependențele și întoarce `409 Conflict` cu mesaj clar (ex. „Materia are 12 grile; șterge-le întâi") în loc să lase Postgres să arunce o eroare brută. Cascada o lăsăm doar acolo unde schema o impune deja (grilă → răspunsuri/imagini).

> Atenție R2: la ștergerea unei grile, rândurile din `question_images` dispar prin cascadă DB, dar **fișierele din bucket rămân orfane**. La `DELETE` de grilă, serviciul încarcă întâi cheile imaginilor și apelează `R2StorageService.delete(key)` pentru fiecare, apoi șterge grila.

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
- **`AdminSubjectDTO`**: `id, name, description, questionCount`.
- **`AdminFacultySubjectDTO`**: `facultySubjectId, subjectId, name, description, yearOfStudy, credits, questionCount`.
- **`SubjectRequestDTO`**: `name` (`@NotBlank`, ≤100), `description` (≤255).
- **`AttachSubjectRequestDTO`**: `subjectId` (opțional — materie existentă) **sau** `newSubject: SubjectRequestDTO`, plus `yearOfStudy`, `credits`.
- **`FacultySubjectRequestDTO`**: `yearOfStudy`, `credits` (pentru editarea legăturii).

Grile + răspunsuri (expun corectitudinea):
- **`AdminAnswerDTO`**: `id, text, imageUrl, isCorrect, position`.
- **`AdminQuestionDTO`**: `id, subjectId, text, explanation, imageUrl (legacy), images: List<QuestionImageDTO>, answers: List<AdminAnswerDTO>, createdAt`.
- **`AnswerRequestDTO`**: `id (nullable — null = răspuns nou), text (@NotBlank), imageUrl?, isCorrect (@NotNull), position`.
- **`QuestionRequestDTO`**: `text (@NotBlank), explanation?, answers: List<AnswerRequestDTO>` (cu validare: minim 2 răspunsuri, minim 1 corect).

### 3.3 Servicii (`ro.platformamedicala.service.admin`)

- **`AdminUserService`**: `list(page, size, search)` → `PageDTO<AdminUserDTO>` (Panache `find(...).page(...)`, căutare opțională pe `username/email`); `updateUser(id, dto)` → setează **doar** `username` + `role` (verifică unicitatea `username`).
- **`AdminFacultyService`**: `list/get/create/update/delete`. La `delete`: blochează (409) dacă există `faculty_subjects` sau `users` care referă facultatea.
- **`AdminSubjectService`**:
  - CRUD pe `Subject` (`create/update/delete`; delete blocat dacă are grile sau legături `faculty_subjects`).
  - `listForFaculty(facultyId)` → `AdminFacultySubjectDTO[]` (join pe `faculty_subjects`).
  - `attachToFaculty(facultyId, dto)` → creează `Subject` (dacă `newSubject`) + `FacultySubject`.
  - `updateLink(facultySubjectId, dto)` / `detach(facultySubjectId)`.
- **`AdminQuestionService`**:
  - `listForSubject(subjectId)` → `AdminQuestionDTO[]` (cu răspunsuri + imagini).
  - `get(questionId)`.
  - `create(subjectId, dto)` → persistă `Question` + `Answer`-uri.
  - `update(questionId, dto)` → sincronizează răspunsurile (vezi §2.5 / decizia de mai jos).
  - `delete(questionId)` → șterge întâi fișierele R2 ale imaginilor, apoi grila (cascadă pe `answers`/`question_images`).

**Sincronizarea răspunsurilor la `update`** (decizie §8): răspunsurile cu `id` existent se **editează pe loc** (păstrăm id-ul, ca să nu rupem `user_answers`); cele cu `id = null` se **adaugă**; cele lipsă din payload se **șterg doar dacă nu sunt referite** în `user_answers` (altfel 409). Asta evită coruperea istoricului de răspunsuri.

### 3.4 Resources (endpoint-uri REST)

Toate sub `@RolesAllowed("ADMIN")`. Prefix `/api/admin`.

**Useri** — `AdminUserResource` (`/api/admin/users`):
- `GET /?page=0&size=20&search=` → `PageDTO<AdminUserDTO>`
- `PATCH /{id}` (`UpdateUserRequestDTO`) → `AdminUserDTO`

**Facultăți** — `AdminFacultyResource` (`/api/admin/faculties`):
- `GET /` → `List<AdminFacultyDTO>`
- `GET /{id}` → `AdminFacultyDetailDTO`
- `POST /` (`FacultyRequestDTO`) → `AdminFacultyDTO`
- `PUT /{id}` (`FacultyRequestDTO`) → `AdminFacultyDTO`
- `DELETE /{id}` → 204 / 409
- `GET /{facultyId}/subjects` → `List<AdminFacultySubjectDTO>`
- `POST /{facultyId}/subjects` (`AttachSubjectRequestDTO`) → `AdminFacultySubjectDTO`

**Materii** — `AdminSubjectResource` (`/api/admin/subjects`):
- `GET /` → `List<AdminSubjectDTO>` (catalog global, pentru atașare)
- `POST /` (`SubjectRequestDTO`) → `AdminSubjectDTO`
- `PUT /{id}` (`SubjectRequestDTO`) → `AdminSubjectDTO`
- `DELETE /{id}` → 204 / 409
- `GET /{subjectId}/questions` → `List<AdminQuestionDTO>`
- `POST /{subjectId}/questions` (`QuestionRequestDTO`) → `AdminQuestionDTO`

**Legături facultate-materie** — `AdminFacultySubjectResource` (`/api/admin/faculty-subjects`):
- `PUT /{id}` (`FacultySubjectRequestDTO`) → `AdminFacultySubjectDTO`
- `DELETE /{id}` → 204 (dezleagă, nu șterge materia)

**Grile** — `AdminQuestionResource` (`/api/admin/questions`):
- `GET /{id}` → `AdminQuestionDTO`
- `PUT /{id}` (`QuestionRequestDTO`) → `AdminQuestionDTO`
- `DELETE /{id}` → 204 (șterge și fișierele R2)

**Imagini** — `QuestionImageResource` existent, cu scrierea mutată pe `@RolesAllowed("ADMIN")`.

### 3.5 Validări

- Unicitate `username` (user), `name` (facultate, materie) — verificare în serviciu + mesaj 409 prietenos (nu doar excepția de constrângere).
- Grilă: minim 2 răspunsuri, minim 1 corect, `position` consecutive (sau normalizate la salvare).
- `role` ∈ {USER, ADMIN}.
- Upload imagini: păstrăm limita 5MB + whitelist content-type (deja implementate în `QuestionImageResource`).

## 4. Bază de date

**Fără modificări de schemă** — modulul e CRUD peste tabelele existente (`users`, `faculties`, `subjects`, `faculty_subjects`, `questions`, `answers`, `question_images`).

Opțional (recomandat la volume mari):
- Index pentru căutarea/paginarea userilor: `CREATE INDEX idx_users_username ON users(username);` (email are deja unique → index implicit).
- **Seed cont admin**: în `init.sql` (sau script separat) un user cu `role = 'ADMIN'` pentru bootstrap, altfel nimeni nu poate accesa modulul. Parola hash-uită cu același algoritm ca în `AuthService`.

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
/admin/faculties/:facultyId -> AdminFacultyDetailPage (materiile facultății)
/admin/subjects/:subjectId  -> AdminSubjectQuestionsPage (grilele materiei)
/admin/questions/new        -> AdminQuestionEditorPage (creare; subjectId din query)
/admin/questions/:questionId-> AdminQuestionEditorPage (editare + imagini)
```

### 5.4 Servicii + tipuri

- **`types/admin.types.ts`**: `PageResult<T>`, `AdminUser`, `AdminFaculty`, `AdminFacultyDetail`, `AdminSubject`, `AdminFacultySubject`, `AdminQuestion`, `AdminAnswer`, plus tipurile de request.
- **`service/admin.service.ts`**: funcții pentru toate endpoint-urile de mai sus (useri, facultăți, materii, legături, grile, imagini).

### 5.5 Pagini

- **`AdminDashboardPage`** — puncte de intrare (Useri, Facultăți). Fără statistici.
- **`AdminUsersPage`** — tabel **paginat** (controale prev/next + mărime pagină), căutare opțională; buton „Editează" → modal cu **doar** `username` + `role` (dropdown). Restul câmpurilor afișate read-only.
- **`AdminFacultiesPage`** — listă facultăți; creare/editare prin modal/formular; ștergere cu confirmare (afișează 409 prietenos dacă e referită).
- **`AdminFacultyDetailPage`** — materiile facultății (an/credite/nr. grile); „Adaugă materie" (alege din catalog **sau** creează nouă, cu an+credite); editare legătură; dezlegare. Click pe materie → grilele ei.
- **`AdminSubjectQuestionsPage`** — lista grilelor materiei, fiecare cu răspunsurile colorate **corect (verde) / greșit**, miniaturi imagini; „Adaugă grilă"; editare/ștergere.
- **`AdminQuestionEditorPage`** — formular grilă: `text`, `explanation`, listă de răspunsuri (text + checkbox „corect" + ordine + imagine opțională), validare client (≥2 răspunsuri, ≥1 corect). După **salvarea** grilei (avem `questionId`), secțiune de **upload imagini** (folosește `postForm` → `/api/questions/{id}/images`), cu listă + ștergere.

### 5.6 UX / detalii

- Toate paginile de admin folosesc același shell ca restul app-ului (`AppLayout` + sidebar), cu un breadcrumb facultate → materie → grilă.
- Erorile de server (404/409/400) se mapează la mesaje clare (ex. „Numele facultății există deja").
- Afișarea corect/greșit: verde pentru `isCorrect`, neutru altfel (e zonă de admin, deci se vede deschis — spre deosebire de quiz).
- Acțiunile distructive (delete) cer confirmare.

## 6. Pași de implementare (ordine recomandată)

1. **Backend — securitate**: mută scrierea imaginilor pe `@RolesAllowed("ADMIN")`; confirmă că `@RolesAllowed("ADMIN")` funcționează (token are deja `groups`).
2. **Backend — DTO-uri admin** (`dto.admin`), inclusiv `PageDTO<T>`.
3. **Backend — useri**: `AdminUserService` + `AdminUserResource` (listă paginată + PATCH username/role).
4. **Backend — facultăți**: serviciu + resource (CRUD + delete defensiv).
5. **Backend — materii + legături**: `AdminSubjectService` + `AdminSubjectResource` + `AdminFacultySubjectResource`.
6. **Backend — grile**: `AdminQuestionService` + `AdminQuestionResource` (CRUD + sincronizare răspunsuri + ștergere fișiere R2).
7. **Backend — seed admin** în `init.sql` + (opțional) index useri.
8. **Backend — teste** (RestAssured): acces interzis fără rol ADMIN (403), paginare useri, PATCH respinge câmpuri în afară de username/role, delete defensiv (409), creare grilă cu validări, upload imagine doar admin.
9. **Frontend — `api.ts`**: `put/patch/del/postForm`.
10. **Frontend — guard + tab**: `AdminRoute`, item „Administrare" condiționat de rol.
11. **Frontend — tipuri + `admin.service.ts`**.
12. **Frontend — pagini**: Dashboard → Users (paginat) → Faculties → FacultyDetail (materii) → SubjectQuestions → QuestionEditor (cu imagini).
13. **Test manual end-to-end**: ca admin, creează facultate → materie (atașată cu an/credite) → grilă cu răspunsuri + imagine; verifică în quiz (ca user) că grila și imaginea apar; editează username+rol al unui user; testează ștergerile defensive.

## 7. Definirea „gata" (Definition of Done)

- Tab-ul „Administrare" apare **doar** la useri `ADMIN`; rutele `/admin/*` sunt blocate altora (frontend) și endpoint-urile `/api/admin/*` întorc **403** fără rol ADMIN (backend).
- **Useri**: listă **paginată**; editare limitată strict la `username` + `role` (restul ignorat server-side).
- **Facultăți / materii / grile / răspunsuri**: creare + editare completă; ștergere cu blocare prietenoasă când există dependențe.
- **Materii per facultate**: vizualizare cu an/credite; atașare (din catalog sau nouă) + dezlegare fără a șterge materia globală.
- **Grile per materie**: se văd toate răspunsurile cu marcaj **corect/greșit** + imaginile.
- **Imagini**: adminul poate încărca/șterge imagini pe grile (R2); la ștergerea grilei, fișierele R2 nu rămân orfane.
- Fără secțiune de statistici (amânată).

## 8. Decizii de confirmat

1. **Ștergere defensivă (409) vs. cascadă** la facultăți/materii referite — planul propune blocare cu mesaj; de confirmat dacă vrei cascadă în vreun caz.
2. **Editarea răspunsurilor** când sunt deja referite în `user_answers`: păstrăm id-urile (editare pe loc) și blocăm ștergerea celor referite. De confirmat.
3. **Seed-ul contului de admin** (cum se creează primul admin) — în `init.sql` sau printr-un script separat.
4. **Catalog global de materii**: atașarea unei materii la o facultate permite și **reutilizarea** unei materii existente (nu doar creare nouă) — de confirmat dacă vrei și reutilizare în UI din prima versiune.
5. **Paginare** doar la useri în v1; facultăți/materii/grile rămân liste simple — de confirmat dacă vrei paginare și acolo.
