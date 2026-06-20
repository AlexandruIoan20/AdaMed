# Plan de implementare: Moduri de sesiune (Învățare / Practică) + ordine aleatoare a răspunsurilor

> Status: Draft — neimplementat
> Stack: Quarkus (backend) · React 19 + Vite (frontend) · PostgreSQL
> Depinde de: [02-quiz-module.md](./02-quiz-module.md) (modulul de quiz existent, deja implementat)

## 1. Obiectiv

Extindem funcționalitatea de pornire a sesiunilor cu **două moduri** și corectăm afișarea răspunsurilor:

1. **Mod Învățare** (`LEARNING`) — comportamentul actual: se afișează **toate cele 10 răspunsuri** ale grilei.
2. **Mod Practică** (`PRACTICE`) — pentru fiecare grilă se aleg **doar 5 răspunsuri din cele 10** (cu **minim unul corect**) și **numai acelea** se afișează.
3. **Ordine aleatoare a răspunsurilor**, în **ambele moduri** — nu mai apar întâi toate cele corecte și apoi cele greșite (cum se întâmplă acum, din cauza ordonării după `position`).
4. Un student poate avea, **per materie**, câte o sesiune activă **de fiecare tip**: maxim **o sesiune `ACTIVE` per (user, materie, mod)**. Sesiunile terminate **rămân în istoric**; după terminarea uneia, studentul poate porni alta de același tip (care devine noua sesiune activă).

La final, întreg sistemul trebuie să fie implementat și funcțional (backend + frontend + DB).

## 2. Decizii structurale cheie

### 2.1 Subset + ordine derivate determinist (RNG cu sămânță) — fără stocare suplimentară

Atât **subsetul de 5** (practică), cât și **ordinea aleatoare** (ambele moduri) trebuie să fie **stabile pe durata sesiunii**: la refresh sau la revenirea pe grilă, studentul trebuie să vadă **aceleași opțiuni, în aceeași ordine**. Altfel:
- subsetul de 5 s-ar schimba la fiecare `GET .../next`, iar punctarea ar deveni inconsistentă;
- reordonarea la fiecare refresh ar fi derutantă și exploatabilă (re-cerere până apare o configurație favorabilă).

În plus, punctarea „tot-sau-nimic" în practică trebuie raportată la **subsetul afișat** (vezi §2.2), deci backend-ul trebuie să poată reconstrui exact ce a văzut userul.

**Soluția aleasă (optimizată pentru DB): derivare deterministă, fără tabelă/coloană de opțiuni.** Subsetul și ordinea se calculează „pe loc", dintr-o **sămânță stabilă** compusă din `(session_id, question_id)`, folosind un PRNG cu algoritm fix (`java.util.Random`). Aceeași funcție pură e folosită **și la servire (`next`), și la punctare (`submit`)** → același rezultat de fiecare dată, garantat, fără nimic persistat în plus.

De ce e cea mai ieftină variantă pentru bază:
- **Zero rânduri/coloane** pentru opțiuni — singura schimbare de schemă e enum-ul + coloana `mode` (§3).
- **Zero scrieri** la pornirea sesiunii (fără burst de `INSERT`-uri) și **zero creștere de stocare** odată cu numărul de useri/sesiuni/grile.
- Citirea rămâne strict pe datele existente (`answers`), pe care oricum le încărcam.

Cost asumat (compromisul abordării): algoritmul de derivare trebuie să rămână **stabil în timp** — dacă e schimbat, sesiunile `ACTIVE` în curs ar putea recalcula alt subset/altă ordine. Mitigare: funcția e **pură și izolată** într-un singur loc; o eventuală modificare s-ar versiona. Sesiunile terminate nu mai re-servesc grile, deci nu sunt afectate. Conținutul (grile/răspunsuri) e static pe durata unei sesiuni active.

> Notă: o sesiune nouă are alt `session_id` → altă sămânță → alt subset/altă ordine. Exact ce vrem: la re-practică, configurație proaspătă.

### 2.2 Punctare în modul practică

Se păstrează regula **tot-sau-nimic**, dar calculată **relativ la opțiunile afișate**:
- `corectAfișate` = răspunsurile din subsetul derivat care au `is_correct = true`;
- grila e corectă ⟺ `selecția userului == corectAfișate` (exact, fără în plus, fără lipsă);
- feedback vizual granular (verde / roșu / portocaliu) ca în [02-quiz-module.md §2](./02-quiz-module.md), dar pe baza opțiunilor afișate.

### 2.3 O sesiune activă per (user, materie, mod)

Cheia de unicitate pentru sesiunea activă devine **(user, subject, mod)** în loc de (user, subject). Istoricul (FINISHED/ABANDONED) nu blochează pornirea uneia noi.

## 3. Bază de date

> Schema e ținută în `database/init.sql` (aplicat la inițializarea containerului Postgres). Pentru baze de dezvoltare existente sunt necesare `ALTER`-uri (vezi §3.3) sau recrearea volumului.

Modificările de schemă sunt **minime** — abordarea cu RNG determinist (§2.1) nu adaugă nicio tabelă și nicio coloană pentru opțiuni.

### 3.1 Enum nou `session_mode` + coloană `mode`

```sql
CREATE TYPE session_mode AS ENUM ('LEARNING', 'PRACTICE');

ALTER TABLE quiz_sessions
  ADD COLUMN mode session_mode NOT NULL DEFAULT 'LEARNING';
```

### 3.2 Bug existent de remediat în `init.sql`

În definiția `CREATE TABLE quiz_sessions`, linia `status session_status DEFAULT 'ACTIVE'` apare **de două ori** — pe o bază nouă, Postgres dă eroare („column \"status\" specified more than once"). Trebuie eliminat duplicatul cu ocazia acestei modificări.

### 3.3 Migrare pentru baze existente

```sql
CREATE TYPE session_mode AS ENUM ('LEARNING', 'PRACTICE');
ALTER TABLE quiz_sessions ADD COLUMN mode session_mode NOT NULL DEFAULT 'LEARNING';
```

Sesiunile `ACTIVE` create înainte de migrare primesc `mode = 'LEARNING'` (default) și funcționează nemodificat: derivarea deterministă se aplică oricărei sesiuni, indiferent când a fost creată.

> Nicio tabelă `session_question_options` și niciun index suplimentar nu mai sunt necesare (varianta din schița inițială a fost abandonată din motive de optimizare — vezi §2.1). Indexurile recomandate în [02 §5](./02-quiz-module.md) rămân suficiente.

## 4. Backend (Quarkus)

### 4.1 Entități

- **`SessionMode`** (enum nou în `ro.platformamedicala.entities`): `LEARNING`, `PRACTICE`.
- **`QuizSession`**: câmp nou `mode` (`SessionMode`), mapat cu același pattern ca `status`:
  ```java
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "session_mode")
  private SessionMode mode = SessionMode.LEARNING;
  ```
- **Nicio entitate nouă** (nu mai există `SessionQuestionOption`).

### 4.2 Helper de derivare deterministă (piesa centrală)

Un singur loc, folosit **și** de `getNextQuestion`, **și** de `submitAnswer` — garanția că „ce arăți" = „ce punctezi".

```java
// service/quiz/QuestionOptionSelector.java (sau metodă privată în QuizSessionService)
//
// Pură și deterministă: aceleași intrări -> aceeași listă, mereu.
static List<Answer> selectOptions(UUID sessionId, UUID questionId,
                                  SessionMode mode, List<Answer> allAnswers) {
    // 1. Ordine de bază STABILĂ (independentă de ordinea în care vine din DB)
    List<Answer> base = allAnswers.stream()
            .sorted(Comparator.comparing(Answer::getId))   // UUID natural order
            .collect(Collectors.toList());

    // 2. Sămânță stabilă din (session, question)
    long seed = mix(sessionId, questionId);
    Random rng = new Random(seed);                         // algoritm fix, reproductibil

    // 3. Amestecare deterministă
    Collections.shuffle(base, rng);

    if (mode == SessionMode.LEARNING) {
        return base;                                       // toate, ordine aleatoare
    }

    // PRACTICE: 5 din 10, minim una corectă
    int take = Math.min(5, base.size());
    List<Answer> chosen = new ArrayList<>(base.subList(0, take));
    boolean hasCorrect = chosen.stream().anyMatch(a -> Boolean.TRUE.equals(a.getIsCorrect()));
    if (!hasCorrect) {
        Answer firstCorrect = base.stream()
                .skip(take)
                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                .findFirst().orElse(null);
        if (firstCorrect != null) {
            chosen.set(take - 1, firstCorrect);            // înlocuire deterministă
            Collections.shuffle(chosen, rng);              // ca să nu fie mereu pe ultima poziție
        }
    }
    return chosen;
}

private static long mix(UUID a, UUID b) {
    long h = a.getMostSignificantBits();
    h = h * 31 + a.getLeastSignificantBits();
    h = h * 31 + b.getMostSignificantBits();
    h = h * 31 + b.getLeastSignificantBits();
    return h;
}
```

Note de implementare:
- Folosim **`java.util.Random`** (nu `SecureRandom`/`SplittableRandom`): algoritmul lui și cel din `Collections.shuffle` sunt fixate prin spec → reproductibile între rulări/versiuni JVM.
- `position` trimis în DTO = indexul în lista returnată (0..n-1). Nu se persistă nicăieri.
- Robust pentru date degenerate (mai puțin de 5 răspunsuri / fără corecte): `take = min(5, n)` și garantăm ≥1 corect doar dacă există vreun corect.

### 4.3 `QuizSessionService` — modificări

- **`startSession(User user, UUID subjectId, SessionMode mode)`**:
  1. `accessService.requireAccess(...)`.
  2. Caută sesiune `ACTIVE` pentru `(user, subject, mode)`; dacă există → o reia (return).
  3. Altfel creează `QuizSession` nouă cu `mode`, `status=ACTIVE`, `totalQuestions=count`, `correctAnswers=0`, `startedAt=now`. **Fără generare/scriere de opțiuni** — totul se derivă la servire.
- **`getNextQuestion(User, sessionId)`**:
  - găsește următoarea grilă nerăspunsă (ordine neschimbată: `createdAt, id`);
  - încarcă răspunsurile grilei și apelează `selectOptions(sessionId, questionId, session.mode, answers)`;
  - construiește `QuestionDTO` din lista returnată (5 sau 10 opțiuni, ordine aleatoare, **fără `isCorrect`**).
- **`submitAnswer(User, sessionId, request)`**:
  - reconstruiește subsetul cu **același** `selectOptions(...)` → `mulțimeAfișată`;
  - `corectAfișate` = răspunsurile din `mulțimeAfișată` cu `is_correct=true`;
  - validează că fiecare `selectedId ∈ mulțimeAfișată` (respinge id-uri ascunse — înlocuiește validarea actuală „orice răspuns al grilei");
  - `wasCorrect = selectedIds.equals(corectAfișate)`;
  - persistă `UserAnswer` (un rând per opțiune bifată; rând santinelă cu `selectedAnswer=null` dacă nu bifează nimic) — neschimbat;
  - `AnswerResultDTO.correctAnswerIds = corectAfișate`.
- **`finishSession` / `getSession`**: neschimbate (doar `SessionResultDTO` capătă `mode`).

### 4.4 DTO-uri (`ro.platformamedicala.dto.quiz`)

Request:
- **`StartSessionRequestDTO`**: câmp nou `mode` (`SessionMode`). Acceptăm `null` → default `LEARNING` (backward-compat), dar frontend-ul trimite mereu explicit.

Response (modificări):
- **`SessionResultDTO`**: câmp nou `mode`.
- **`SubjectListItemDTO`** și **`SubjectDetailDTO`**: metrici **per mod** în loc de unice:
  - `learningSolvedQuestions`, `practiceSolvedQuestions` (grile distincte rezolvate în sesiuni de acel tip);
  - `learningActiveSessionId`, `practiceActiveSessionId` (nullable);
  - se păstrează `totalQuestions`;
  - se elimină `solvedQuestions` / `hasActiveSession` / `activeSessionId` (sau se derivă `hasActiveSession*` din id-uri).
- **`QuestionDTO`** / **`AnswerOptionDTO`**: structură neschimbată (deja conțin doar `id/text/imageUrl/position`, **fără `isCorrect`**). Diferența: numărul de opțiuni e 5 sau 10, în ordine aleatoare.
- **`AnswerResultDTO`**: neschimbat structural; `correctAnswerIds` conține doar **corecte din subsetul afișat**.

### 4.5 `SubjectQueryService` — modificări

- `countSolvedQuestions(userId, subjectId, mode)` — filtrează după modul sesiunii:
  ```sql
  select count(distinct ua.question.id) from UserAnswer ua
   where ua.user.id = :uid and ua.question.subject.id = :sid and ua.session.mode = :mode
  ```
- `findActiveSession(userId, subjectId, mode)` — adaugă filtrul pe `mode`.
- `listForUser` / `getDetail` — populează `learning/practiceSolvedQuestions` și `learning/practiceActiveSessionId`. În `getDetail`, lista `sessions` include `mode` per sesiune.

### 4.6 Resurse REST

- **`QuizResource.startSession`**: corpul conține acum `mode` (prin `StartSessionRequestDTO`). Path neschimbat (`POST /api/quiz/sessions`).
- Restul endpoint-urilor neschimbate. Verificările de ownership/izolare pe facultate rămân (vezi [02 §3.5](./02-quiz-module.md)).

### 4.7 Securitate (neschimbată ca principii)

- `isCorrect` nu apare niciodată în `QuestionDTO`/`AnswerOptionDTO`; se dezvăluie doar în `AnswerResultDTO` după submit.
- La submit se **resping id-uri care nu sunt în subsetul afișat** — un user nu poate trimite id-ul unui răspuns ascuns în modul practică.

## 5. Frontend (React + Vite)

### 5.1 Tipuri și servicii

- **`types/quiz.types.ts`**:
  - `SessionMode = "LEARNING" | "PRACTICE"`;
  - `SessionResult` capătă `mode`;
  - `SubjectListItem` / `SubjectDetail`: `learningSolvedQuestions`, `practiceSolvedQuestions`, `learningActiveSessionId`, `practiceActiveSessionId`.
- **`service/quiz.service.ts`**: `startSession(subjectId, mode)` trimite `{ subjectId, mode }`.

### 5.2 `SubjectDetailPage`

- Înlocuiește butonul unic cu **două acțiuni**:
  - **Învățare** — „Începe învățare" / „Continuă învățare" (dacă `learningActiveSessionId != null`);
  - **Practică** — „Începe practică" / „Continuă practică" (dacă `practiceActiveSessionId != null`).
- Afișează **progres separat pe moduri**: `X / Y la învățare`, `X / Y la practică`.
- Istoricul sesiunilor: fiecare rând arată **modul** (etichetă „Învățare"/„Practică") + status + scor.
- La start → `navigate('/quiz/:sessionId')` (ca acum).

### 5.3 `SubjectsPage`

- Cardul materiei arată cele două progrese (învățare / practică) și, opțional, indicator „în curs" per mod. Navigarea rămâne către detaliu, unde se alege modul.

### 5.4 `QuizPage` / `QuestionCard`

- **Niciun cod special pentru ordine** — opțiunile vin deja amestecate și în subsetul corect de la backend; se randează în ordinea primită.
- Numărul de opțiuni e dinamic (5 sau 10) — `QuestionCard` randează câte opțiuni primește (deja face asta).
- Opțional: afișează o etichetă a modului în antet (din `getSession().mode`).

### 5.5 `QuizResultPage`

- Opțional: afișează modul sesiunii în titlu/rezumat.

## 6. Pași de implementare (ordine recomandată)

1. **DB**: `init.sql` — fix duplicat `status`, `CREATE TYPE session_mode`, coloana `mode`. Scrie și `ALTER`-urile de migrare. (Fără tabele/indexuri noi.)
2. **Backend — entități**: `SessionMode`, câmp `mode` în `QuizSession` (NAMED_ENUM).
3. **Backend — helper `selectOptions` + `mix`** (§4.2): derivarea deterministă, izolată și testabilă unitar.
4. **Backend — DTO-uri**: `mode` în `StartSessionRequestDTO` și `SessionResultDTO`; metrici per mod în `SubjectListItemDTO`/`SubjectDetailDTO`.
5. **Backend — `QuizSessionService`**: `startSession(mode)`, `getNextQuestion` și `submitAnswer` pe baza `selectOptions` (servire + punctare pe subset).
6. **Backend — `SubjectQueryService`**: numărători și sesiuni active per mod.
7. **Backend — `QuizResource`**: preluare `mode` din request.
8. **Backend — teste**:
   - unitar pe `selectOptions`: **determinism** (același input → același output de N ori), practică = exact 5 cu ≥1 corectă, învățare = toate, ordinea nu e mereu corecte-întâi (pe un eșantion de grile);
   - integrare (RestAssured): servire 5 vs. 10, punctare tot-sau-nimic pe subset, respingere id ascuns, **stabilitate** la re-cerere (`next` de două ori → aceeași ordine), o singură sesiune `ACTIVE` per (user, materie, mod), istoricul păstrat după `finish` + pornire nouă de același tip.
9. **Frontend — tipuri + servicii**: `SessionMode`, `startSession(subjectId, mode)`, câmpuri noi.
10. **Frontend — `SubjectDetailPage`**: două acțiuni + progres per mod + mod în istoric.
11. **Frontend — `SubjectsPage`**: progres per mod pe card.
12. **Frontend — `QuizPage`/`QuizResultPage`**: (opțional) etichetă mod; verifică randarea pentru 5 vs. 10 opțiuni.
13. **Test manual end-to-end**: pornește atât învățare (10 opțiuni, ordine amestecată) cât și practică (5 opțiuni, ≥1 corectă) pe aceeași materie; verifică punctarea pe subset, persistența ordinii la refresh, cele două sesiuni active simultane (una/tip) și acumularea în istoric după terminare.

## 7. Definirea „gata" (Definition of Done)

- La pornirea unei sesiuni se alege explicit modul (Învățare/Practică).
- **Practică**: fiecare grilă afișează exact 5 opțiuni (din 10), cu minim una corectă; punctarea tot-sau-nimic e raportată la cele 5 afișate.
- **Învățare**: se afișează toate cele 10 opțiuni (comportament actual).
- În **ambele** moduri, ordinea opțiunilor e aleatoare (nu corecte-întâi) și **stabilă** pe durata sesiunii (nu se schimbă la refresh) — verificat prin `next` repetat.
- Maxim **o sesiune `ACTIVE` per (user, materie, mod)**; după terminare, sesiunea rămâne în istoric și se poate porni una nouă de același tip.
- Progres afișat **separat** pentru învățare și practică.
- `isCorrect` nu apare în niciun payload înainte de submit; id-urile ascunse (modul practică) nu pot fi trimise la submit.
- **Fără cost suplimentar de stocare**: nicio tabelă/coloană pentru opțiuni; subsetul și ordinea se derivă determinist.
- Izolarea pe facultate și ownership-ul sesiunii rămân aplicate server-side.

## 8. Decizii confirmate

1. **Două moduri**: `LEARNING` (10 opțiuni, ca acum) și `PRACTICE` (5 din 10, minim una corectă).
2. **Ordine aleatoare în ambele moduri**, stabilă pe durata sesiunii, **derivată determinist** dintr-o sămânță `(session_id, question_id)` — fără stocare suplimentară (alegere de optimizare a bazei).
3. **Punctare practică**: tot-sau-nimic raportat la subsetul de 5 afișat.
4. **O singură sesiune `ACTIVE` per (user, materie, mod)**; sesiunile terminate **rămân în istoric**, iar după terminare se poate porni alta de același tip.
5. **Progres separat pe moduri** pe cardul/detaliul materiei.
