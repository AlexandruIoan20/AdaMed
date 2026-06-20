# Plan de implementare: Modul de Rezolvare Grile (Quiz)

> Status: FINISHED - implementat si testat
> Stack: Quarkus (backend) · React 19 + Vite (frontend) · PostgreSQL
> Depinde de: [01-auth-module.md](./01-auth-module.md) (user autentificat prin cookie JWT)

## 1. Obiectiv

La finalul acestui modul, un student autentificat poate:
1. Vedea **lista materiilor de la facultatea lui** (și NUMAI de la ea).
2. Deschide o materie și vedea **detalii + metadate**: descriere, an de studiu, credite, număr total de grile, câte a rezolvat, scorul lui istoric.
3. **Începe o sesiune de quiz** pe acea materie.
4. Rezolva grilele una câte una: vede grila curentă, **selectează răspunsuri** (selecție multiplă — vezi §2) și le trimite la backend.
5. Vedea **feedback** după fiecare grilă (corect/greșit + explicație) și **rezultatul final** al sesiunii.

## 2. Decizie structurală cheie — grile cu selecție multiplă

Datele actuale (`questions.json`, seed Biochimie): **fiecare grilă are 10 răspunsuri, dintre care exact 5 corecte.** Deci NU e single-choice, ci **multiple-choice** (stil admitere medicină / „complement multiplu").

**Regula de punctare (confirmată): tot-sau-nimic.** O grilă e marcată **rezolvată corect** doar dacă utilizatorul bifează **exact mulțimea celor 5 răspunsuri corecte** (nici unul în plus, nici unul lipsă). Orice abatere → grila NU e trecută ca rezolvată corect.

**Feedback vizual granular (confirmat).** Deși scorul e tot-sau-nimic, UI-ul arată detaliat ce a bifat userul, cu trei stări (vezi §4.3 pentru culori):
- **verde** — răspuns corect, bifat de user (corect selectat);
- **roșu** — răspuns greșit, bifat de user (selecție greșită);
- **portocaliu** — răspuns corect pe care userul **NU** l-a bifat (omis) — semnalat sugestiv ca „ai fi trebuit să-l alegi".

Astfel userul vede exact unde a greșit (ce a bifat în plus și ce a omis), chiar dacă grila rămâne marcată ca incorectă.

Consecințe asupra modelului:
- Tabela `user_answers` are coloana `selected_answer_id` (un singur răspuns per rând). Pentru o grilă cu selecție multiplă, **un răspuns al utilizatorului = mai multe rânduri** în `user_answers` (câte unul per opțiune bifată), toate cu același `session_id` + `question_id`.
- `is_correct` pe rândul din `user_answers` reflectă dacă **acea opțiune bifată** era corectă; corectitudinea grilei întregi (folosită pentru `quiz_sessions.correct_answers`) se calculează agregat: toate cele 5 corecte bifate ȘI nicio opțiune greșită bifată.

> La trimiterea răspunsului, backend-ul nu trebuie să trimită niciodată spre frontend `is_correct` al opțiunilor înainte ca utilizatorul să răspundă — altfel răspunsul e vizibil în DevTools (vezi §3.5).

## 3. Backend (Quarkus)

### 3.1 Entități noi

Tabelele există deja în `database/init.sql` (`quiz_sessions`, `user_answers`). Lipsesc entitățile JPA — de creat în `ro.platformamedicala.entities`:

- **`SessionStatus`** (enum) — `ACTIVE`, `FINISHED`, `ABANDONED`. Mapat la enum-ul Postgres `session_status` cu `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` (același pattern ca `UserRole` în `User.java` — altfel insert-ul eșuează cu „column is of type session_status but expression is of type character varying").
- **`QuizSession`** — `id`, `user` (`@ManyToOne` User), `subject` (`@ManyToOne` Subject), `status`, `totalQuestions`, `correctAnswers`, `startedAt`, `finishedAt`.
- **`UserAnswer`** — `id`, `session` (`@ManyToOne` QuizSession), `user` (`@ManyToOne` User), `question` (`@ManyToOne` Question), `selectedAnswer` (`@ManyToOne` Answer, nullable), `isCorrect`, `answeredAt`.

(Entitățile `Subject`, `Question`, `Answer`, `FacultySubject` există deja cu relațiile modelate.)

### 3.2 DTO-uri (`ro.platformamedicala.dto.quiz`)

Request:
- `StartSessionRequestDTO` — `subjectId` (UUID).
- `SubmitAnswerRequestDTO` — `questionId` (UUID), `selectedAnswerIds` (List<UUID>) — opțiunile bifate de utilizator.

Response:
- `SubjectListItemDTO` — `subjectId`, `name`, `description`, `yearOfStudy`, `credits`, `totalQuestions`, `solvedQuestions` (câte grile distincte a răspuns userul la materia asta), `lastSessionScore` (opțional).
- `SubjectDetailDTO` — tot ce e în list item + listă de sesiuni recente ale userului (status, scor, dată).
- `QuestionDTO` — `questionId`, `text`, `imageUrl`, `answers: List<AnswerOptionDTO>`. **`AnswerOptionDTO` conține DOAR** `answerId`, `text`, `imageUrl`, `position` — **NICIODATĂ** `isCorrect` (vezi §3.5).
- `AnswerResultDTO` — răspunsul după submit: `correctAnswerIds` (List<UUID>), `wasCorrect` (boolean — grila întreagă), `explanation`, plus marcaj per opțiune (corect/greșit) pentru afișare.
- `SessionResultDTO` — `sessionId`, `totalQuestions`, `correctAnswers`, `status`, `startedAt`, `finishedAt`.

### 3.3 Servicii (`ro.platformamedicala.service.quiz`)

- **`QuizAccessService`** — verifică faptul că un user are voie să acceseze o materie. Regula: materia trebuie să fie în `faculty_subjects` pentru `user.faculty_id`. Metodă centrală `assertUserCanAccessSubject(User user, UUID subjectId)` care aruncă `ForbiddenException` (403) dacă materia nu aparține facultății userului. **Apelată în TOATE endpoint-urile de quiz** — nu te baza pe filtrarea din UI.
- **`QuizSessionService`**:
  - `startSession(User, subjectId)` → validează accesul. **O singură sesiune `ACTIVE` per (user, subject)**: dacă există deja una activă pentru materie, o **reia** (o întoarce) în loc să creeze alta; altfel creează `QuizSession` nouă cu status `ACTIVE` și `totalQuestions` = nr. grile ale materiei.
  - `getNextQuestion(User, sessionId)` → întoarce următoarea grilă **nerăspunsă** din sesiune, în **ordine fixă** (după `position`/`created_at`), fără `isCorrect` în payload.
  - `submitAnswer(User, sessionId, SubmitAnswerRequestDTO)` → validează accesul + că grila aparține materiei sesiunii; calculează corectitudinea (vezi §2); scrie rândurile în `user_answers`; întoarce `AnswerResultDTO`. **Fără reluarea grilei**: o grilă deja răspunsă în acea sesiune NU poate fi re-trimisă (returnează eroare / e ignorată).
  - `finishSession(User, sessionId)` → marchează `FINISHED`, calculează `correctAnswers`, setează `finishedAt`, întoarce `SessionResultDTO`.
- **`SubjectQueryService`** — listare materii ale facultății userului + agregare metadate (total grile, câte a rezolvat userul, scor istoric).

### 3.4 Resources (endpoint-uri REST)

Toate sub `@Authenticated` (necesită cookie JWT valid). `userId` se ia din `JsonWebToken.getSubject()` (ca în `AuthResource.me()`).

`SubjectResource` — `@Path("/api/subjects")`:
| Metodă | Path | Acțiune |
|---|---|---|
| GET | `/` | Materiile facultății userului curent (+ metadate) |
| GET | `/{subjectId}` | Detalii materie + sesiunile userului (403 dacă nu e a facultății lui) |

`QuizResource` — `@Path("/api/quiz")`:
| Metodă | Path | Acțiune |
|---|---|---|
| POST | `/sessions` | Start sesiune nouă (`StartSessionRequestDTO`) → `SessionResultDTO` |
| GET | `/sessions/{sessionId}/next` | Următoarea grilă nerăspunsă → `QuestionDTO` (sau 204/marcaj „terminat") |
| POST | `/sessions/{sessionId}/answers` | Trimite răspuns (`SubmitAnswerRequestDTO`) → `AnswerResultDTO` |
| POST | `/sessions/{sessionId}/finish` | Încheie sesiunea → `SessionResultDTO` |
| GET | `/sessions/{sessionId}` | Stare/rezultat sesiune |

**Toate** verifică că `sessionId`/`subjectId` aparțin userului curent — un user nu poate accesa sesiunea altuia (altfel IDOR).

### 3.5 Securitate specifică modulului

- `isCorrect` al opțiunilor **nu** se serializează în `QuestionDTO`/`AnswerOptionDTO`. Corectitudinea se dezvăluie doar în `AnswerResultDTO`, **după** submit.
- `QuizAccessService.assertUserCanAccessSubject` apelat în fiecare endpoint — izolare pe facultate aplicată server-side.
- Verificare de proprietate (ownership) pe `sessionId`: sesiunea trebuie să aibă `user_id` == userul din JWT.
- `submitAnswer` respinge grilele care nu fac parte din materia sesiunii și re-trimiterile.

## 4. Frontend (React + Vite)

Respectă arhitectura orizontală existentă (directoare pe tip de fișier: `types/`, `schemas/`, `service/`, `context/`, `pages/`, `components/`).

### 4.1 Fișiere

```
src/
  types/
    quiz.types.ts          -> SubjectListItem, SubjectDetail, Question, AnswerOption, AnswerResult, SessionResult
  service/
    subject.service.ts      -> listSubjects(), getSubject(id)
    quiz.service.ts          -> startSession(), getNextQuestion(), submitAnswer(), finishSession(), getSession()
  pages/
    SubjectsPage.tsx          -> grid de materii ale facultatii userului
    SubjectDetailPage.tsx      -> detalii materie + buton „Începe grile”
    QuizPage.tsx                -> fereastra de rezolvare (grila curenta + submit + feedback)
    QuizResultPage.tsx           -> rezultat final sesiune
  components/
    QuestionCard.tsx              -> afiseaza textul grilei + optiunile (checkbox-uri, multi-select)
    AnswerOption.tsx               -> o optiune bifabila, cu stare vizuala (neutru/corect/gresit dupa submit)
    QuizProgress.tsx                -> bara de progres (intrebarea X din Y)
```

### 4.2 Rute (în `App.tsx`, toate sub `ProtectedRoute`)

- `/subjects` → `SubjectsPage`
- `/subjects/:subjectId` → `SubjectDetailPage`
- `/quiz/:sessionId` → `QuizPage`
- `/quiz/:sessionId/result` → `QuizResultPage`

### 4.3 Comportament UI quiz

- `QuestionCard` randează cele 10 opțiuni ca **checkbox-uri** (selecție multiplă), nu radio.
- Buton „Trimite răspuns” activ doar dacă userul a bifat ≥1 opțiune.
- După submit, fiecare opțiune se colorează în funcție de starea ei (pe baza `AnswerResultDTO`):
  - **verde** — corectă și bifată de user (corect selectat);
  - **roșu** — greșită și bifată de user (selecție greșită);
  - **portocaliu** — corectă, dar NEbifată de user (omisă — „ar fi trebuit aleasă");
  - neutru — greșită și nebifată (irelevantă).
- Se afișează un banner de rezultat al grilei (corect / incorect — tot-sau-nimic) + explicația; butonul devine „Următoarea grilă".
- `QuizProgress` arată „Grila X / Y”.
- La ultima grilă → redirect spre `/quiz/:sessionId/result`.
- Tot prin `service/api.ts` existent (`credentials: "include"`).

## 5. Bază de date

Schema existentă (`quiz_sessions`, `user_answers`, `user_question_bookmarks`) e suficientă. Nicio migrare nouă necesară.

Index recomandate pentru performanță (de adăugat în `init.sql` dacă volumul crește):
- `user_answers (session_id)` și `user_answers (user_id, question_id)`.
- `quiz_sessions (user_id, subject_id, status)`.
- `questions (subject_id)`.

## 6. Pași de implementare (ordine recomandată)

1. **Backend — enum + entități**: `SessionStatus`, `QuizSession`, `UserAnswer` (cu maparea NAMED_ENUM).
2. **Backend — DTO-uri** (§3.2), atenție ca `AnswerOptionDTO` să NU expună `isCorrect`.
3. **Backend — `QuizAccessService`** (izolarea pe facultate) + test.
4. **Backend — `SubjectQueryService` + `SubjectResource`**: listare/detalii materii cu metadate.
5. **Backend — `QuizSessionService`**: start, next, submit (cu logica de scor multi-select), finish.
6. **Backend — `QuizResource`**: toate endpoint-urile + verificări de ownership.
7. **Backend — teste de integrare** (RestAssured): login → start → next → submit (corect și greșit) → finish; plus test 403 pe materie din altă facultate și IDOR pe sesiune străină.
8. **Frontend — types + services** (`quiz.types.ts`, `subject.service.ts`, `quiz.service.ts`).
9. **Frontend — `SubjectsPage` + `SubjectDetailPage`** (listă + detalii + start).
10. **Frontend — `QuizPage` + `QuestionCard`/`AnswerOption`/`QuizProgress`**: flux de rezolvare cu feedback.
11. **Frontend — `QuizResultPage`** + rutele în `App.tsx`.
12. **Test manual end-to-end**: login → /subjects (doar materiile facultății) → deschide Biochimie → start → răspunde la cele 10 grile (verifică scoring multi-select) → rezultat final corect în DB (`quiz_sessions.correct_answers`, rânduri în `user_answers`).

## 7. Definirea „gata” (Definition of Done)

- Un user vede DOAR materiile facultății lui; accesul la o materie din altă facultate → 403.
- Poate porni o sesiune, rezolva toate grilele, primi feedback per grilă și scor final.
- `isCorrect` nu apare în niciun payload înainte de submit (verificat în DevTools → Network).
- Datele sunt persistate corect: `quiz_sessions` (status, scor) + `user_answers` (un rând per opțiune bifată).
- Un user nu poate accesa/modifica sesiunea altui user.

## 8. Decizii confirmate

Toate deciziile deschise au fost confirmate de owner — încorporate în plan:

1. **Punctare: tot-sau-nimic.** Grila e corectă doar dacă exact cele 5 răspunsuri corecte sunt bifate. Feedback vizual granular (verde/roșu/**portocaliu** pentru omise) afișat în UI, dar grila NU e trecută ca rezolvată corect dacă selecția nu e exactă (vezi §2, §4.3).
2. **O singură sesiune `ACTIVE` per (user, materie).** La start, dacă există deja o sesiune activă pentru materie, se reia; nu se creează una nouă (vezi §3.3).
3. **Ordinea grilelor: fixă** (după `position`/`created_at`).
4. **Fără reluarea grilei.** O grilă deja răspunsă într-o sesiune nu poate fi re-trimisă (momentan).
5. **Fără bookmarks.** Tabela `user_question_bookmarks` există, dar funcționalitatea NU e în scope — candidat pentru un plan separat ulterior.
