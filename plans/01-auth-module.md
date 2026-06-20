# Plan de implementare: Modul de Autentificare (JWT + HTTP-Only Cookie)

> Status: Draft — neimplementat
> Stack: Quarkus (backend) · React 19 + Vite (frontend) · PostgreSQL

## 1. Obiectiv

Implementarea unui sistem de autentificare stateless, bazat pe JWT, în care:
- Token-ul nu este niciodată expus în JavaScript (nu se folosește `localStorage`).
- Backend-ul emite JWT-ul într-un cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- Quarkus validează semnătura token-ului la fiecare request, fără interogări suplimentare în baza de date pentru sesiune.
- Parolele sunt stocate hash-uite cu BCrypt, niciodată în clar.

## 2. Strategie de stocare a token-ului — Cookie HTTP-Only

| Aspect | Decizie |
|---|---|
| Locație token | Cookie `HttpOnly` setat de backend pe răspunsul de login/register |
| Acces din JS | Interzis (browser-ul nu permite citirea cookie-ului din `document.cookie`) |
| Atribute cookie | `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=<exp>` |
| CSRF | Mitigat prin `SameSite=Strict` (suficient cât timp nu există formulare cross-site care declanșează request-uri state-changing fără JS) |
| Refresh | Out of scope pentru v1 — token cu expirare fixă (ex. 2h), re-login după expirare. Refresh token poate fi adăugat într-un plan separat. |

Frontend-ul trebuie să trimită toate request-urile către API cu `credentials: "include"` (fetch) sau `withCredentials: true` (axios), altfel browser-ul nu atașează cookie-ul.

## 3. Backend (Quarkus)

### 3.1 Dependențe noi în `backend/pom.xml`

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-smallrye-jwt-build</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-elytron-security-common</artifactId> <!-- BCrypt -->
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-hibernate-validator</artifactId>
</dependency>
```

### 3.2 Chei RSA pentru semnarea JWT

- Generare pereche de chei RSA (privată pentru semnare, publică pentru verificare):
  ```
  openssl genrsa -out backend/src/main/resources/privateKey.pem 2048
  openssl rsa -in backend/src/main/resources/privateKey.pem -pubout -out backend/src/main/resources/publicKey.pem
  ```
- Cheile **nu** se commit-uiesc în producție — pentru dev local e acceptabil să existe în `resources`, dar trebuie adăugate în `.gitignore` și injectate prin variabile de mediu / secret manager în producție.
- Config în `application.properties`:
  ```properties
  mp.jwt.verify.publickey.location=publicKey.pem
  mp.jwt.verify.issuer=https://adamed.app/issuer
  smallrye.jwt.sign.key.location=privateKey.pem
  smallrye.jwt.new-token.issuer=https://adamed.app/issuer
  smallrye.jwt.new-token.lifespan=7200
  quarkus.http.auth.proactive=true
  ```

### 3.3 Entități / modificări

- `User.java` (deja existent) — rămâne neschimbat structural; `passwordHash` se populează cu BCrypt la register.
- `UserRole.java` (deja existent, enum `USER`/`ADMIN`) — folosit ca `groups` claim în JWT.
- Entități noi: niciuna necesară pentru v1 (fără tabel de refresh tokens / blacklist).

### 3.4 DTO-uri (request/response)

`ro.platformamedicala.auth.dto`:
- `RegisterRequest` — username, firstName, lastName, email, password, facultyId, yearOfStudy
- `LoginRequest` — email, password
- `UserResponse` — id, username, firstName, lastName, email, role, facultyId, yearOfStudy (fără passwordHash)

Validare cu Hibernate Validator (`@Email`, `@NotBlank`, `@Size(min = 8)` pe parolă) — oglindește regulile Zod din frontend, ca linie de apărare server-side.

### 3.5 Servicii

- `PasswordService` — wrapper peste `BcryptUtil` (din `quarkus-elytron-security-common`): `hash(String raw)`, `verify(String raw, String hash)`.
- `TokenService` — construiește JWT cu `Jwt.issuer(...).upn(email).groups(role).subject(userId).sign()`.
- `AuthService`:
  - `register(RegisterRequest)` → verifică unicitate email/username, hash parolă, salvează `User`, generează token.
  - `login(LoginRequest)` → caută user după email, verifică parola cu `PasswordService.verify`, generează token.

### 3.6 Resource (endpoint REST)

`ro.platformamedicala.auth.AuthResource` — `@Path("/api/auth")`:

| Metodă | Path | Acțiune |
|---|---|---|
| POST | `/register` | Creează user, setează cookie JWT, returnează `UserResponse` |
| POST | `/login` | Verifică credențiale, setează cookie JWT, returnează `UserResponse` |
| POST | `/logout` | Șterge cookie-ul (Max-Age=0) |
| GET | `/me` | Endpoint protejat (`@Authenticated`) — returnează userul curent pe baza JWT din cookie |

Setarea cookie-ului se face manual pe `Response`, deoarece SmallRye JWT nu pune token-ul în cookie automat:

```java
NewCookie cookie = new NewCookie.Builder("access_token")
        .value(token)
        .path("/")
        .httpOnly(true)
        .secure(true) // false doar în dev pe http local, altfel browserul îl ignoră
        .sameSite(NewCookie.SameSite.STRICT)
        .maxAge(7200)
        .build();
return Response.ok(userResponse).cookie(cookie).build();
```

### 3.7 Configurare Quarkus pentru a citi JWT din cookie (nu din header `Authorization`)

```properties
mp.jwt.token.header=Cookie
mp.jwt.token.cookie=access_token
```

### 3.8 Endpoint-uri protejate

- Resursele care necesită utilizator autentificat folosesc `@RolesAllowed({"USER", "ADMIN"})` sau `@Authenticated`.
- `SecurityIdentity` / `@Inject JsonWebToken jwt` pentru a obține `userId` curent în alte module (quiz, bookmarks etc.) — relevant pentru planurile viitoare.

### 3.9 CORS

`application.properties`:
```properties
quarkus.http.cors=true
quarkus.http.cors.origins=http://localhost:3000
quarkus.http.cors.credentials=true
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS
```
`credentials=true` este obligatoriu pentru ca browserul să trimită/accepte cookie-uri cross-origin în dev (frontend pe :3000, backend pe :8080).

## 4. Frontend (React + Vite)

### 4.1 Dependențe noi în `frontend-med/package.json`

```
npm install react-router-dom react-hook-form @hookform/resolvers
```
(`zod` era deja instalat. Nu e nevoie de `axios` — se folosește `fetch` nativ cu `credentials: "include"`.)

### 4.2 Structură fișiere — arhitectură orizontală (pe tip de fișier, nu pe feature)

Proiectul folosește deja directoare pe orizontală (`components/`, `schemas/`, `service/`, `types/`, `lib/`) — fiecare tip de fișier are propriul director, indiferent de modul funcțional. Auth-ul respectă aceeași convenție, fără un folder dedicat `features/auth/`:

```
frontend-med/src/
  types/
    auth.types.ts        -> User, LoginPayload, RegisterPayload
  schemas/
    auth.schema.ts        -> loginSchema, registerSchema (Zod)
  service/
    api.ts                 -> wrapper fetch cu credentials: "include" + bază URL
    auth.service.ts         -> login(), register(), logout(), me() — apeluri către /api/auth/*
  context/
    AuthContext.tsx          -> context React + hook useAuth() (user curent, login, logout, register)
  pages/
    LoginPage.tsx
    RegisterPage.tsx
  components/
    ProtectedRoute.tsx        -> wrapper care redirectează spre /login dacă user e null
```

### 4.3 Scheme Zod (`schemas.ts`)

```ts
export const loginSchema = z.object({
  email: z.string().email("Email invalid"),
  password: z.string().min(8, "Minim 8 caractere"),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email("Email invalid"),
  password: z.string()
    .min(8, "Minim 8 caractere")
    .regex(/[A-Z]/, "Minim o literă mare")
    .regex(/[0-9]/, "Minim o cifră"),
  facultyId: z.string().uuid(),
  yearOfStudy: z.coerce.number().min(1).max(6),
});
```

(fișier: `schemas/auth.schema.ts`)

### 4.4 Formulare cu React Hook Form

`pages/LoginPage.tsx` / `pages/RegisterPage.tsx` folosesc `useForm({ resolver: zodResolver(schema) })`, afișează erorile per-câmp din `formState.errors`, și la `onSubmit` apelează `service/auth.service.ts` → `login(data)` / `register(data)`.

### 4.5 `service/api.ts`

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include", // esențial: trimite/primește cookie-ul HttpOnly
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

### 4.6 `context/AuthContext.tsx`

- La mount, apelează `GET /api/auth/me` (prin `service/auth.service.ts`) pentru a determina dacă există o sesiune validă (cookie-ul e trimis automat de browser).
- Expune `user`, `loading`, `login(data)`, `register(data)`, `logout()`.
- Nu stochează niciodată token-ul în state/JS — doar obiectul `user` (date publice, nesensibile).
- Exportă și hook-ul `useAuth()` din același fișier (nu se mai creează `useAuth.ts` separat, evită un director `hooks/` doar pentru un singur hook).

### 4.7 Rute protejate

`components/ProtectedRoute.tsx` verifică `useAuth().user`; dacă e `null` și `loading === false`, redirectează la `/login`. Routing prin `react-router-dom` (adăugat ca dependență la 4.1).

## 5. Bază de date

Schema `users` din `database/init.sql` este deja suficientă pentru v1 (există `password_hash`, `email`, `role`). Nu sunt necesare migrări noi pentru autentificare de bază.

Posibile adăugiri ulterioare (NU în acest plan, doar de reținut):
- Tabel `refresh_tokens` dacă se adaugă refresh flow.
- Coloană `failed_login_attempts` / `locked_until` pentru rate-limiting anti-bruteforce.

## 6. Pași de implementare (ordine recomandată)

1. **Backend — setup JWT**: adaugă dependențe Maven, generează cheile RSA, configurează `application.properties`.
2. **Backend — DTO-uri + validare**: `RegisterRequest`, `LoginRequest`, `UserResponse`.
3. **Backend — servicii**: `PasswordService` (BCrypt), `TokenService` (emitere JWT), `AuthService` (logică register/login).
4. **Backend — `AuthResource`**: `/register`, `/login`, `/logout`, `/me`, setare cookie `HttpOnly`.
5. **Backend — CORS**: configurare pentru a permite cookie-uri cross-origin dev.
6. **Backend — teste**: test de integrare cu RestAssured pentru register → login → `/me` → logout.
7. **Frontend — dependențe**: `react-hook-form`, `zod`, `@hookform/resolvers`.
8. **Frontend — `lib/api.ts`**: wrapper fetch cu `credentials: "include"`.
9. **Frontend — scheme Zod + formulare**: `LoginPage`, `RegisterPage` cu validare live.
10. **Frontend — `AuthContext` + `useAuth`**: gestionare stare user curent.
11. **Frontend — `ProtectedRoute`**: protejarea rutelor care necesită autentificare.
12. **Test manual end-to-end**: register → cookie setat (verificat în DevTools, `HttpOnly` flag vizibil) → reload pagină → `/me` păstrează sesiunea → logout → cookie șters.

## 7. Riscuri / decizii care necesită confirmare ulterioară

- **`Secure` flag pe cookie**: în dev pe `http://localhost`, `Secure=true` poate bloca trimiterea cookie-ului în unele browsere dacă nu se rulează pe `https`. De decis: profil dev cu `Secure=false` + `SameSite=Lax`, profil prod cu `Secure=true` + `SameSite=Strict`.
- **Refresh tokens**: v1 nu are refresh flow — la expirarea token-ului (2h), userul trebuie să se autentifice din nou. De discutat dacă e acceptabil pentru UX-ul aplicației sau dacă se adaugă un plan separat de refresh token.
- **Rate limiting login**: neinclus în v1; de adăugat dacă apar abuzuri (brute-force pe `/login`).
