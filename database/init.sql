CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE user_roles AS ENUM ('USER', 'ADMIN');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'FINISHED', 'ABANDONED');
CREATE TYPE session_mode AS ENUM ('LEARNING', 'PRACTICE');

-- FACULTIES
CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500)
);

-- SUBJECTS
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  username VARCHAR(30) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,

  email VARCHAR(100) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,

  password_hash VARCHAR(255) NOT NULL,

  faculty_id UUID NOT NULL REFERENCES faculties(id),
  year_of_study INT NOT NULL DEFAULT 1,

  role user_roles NOT NULL DEFAULT 'USER',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FACULTY SUBJECTS (MANY-TO-MANY + metadata)
CREATE TABLE faculty_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  faculty_id UUID NOT NULL REFERENCES faculties(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),

  year_of_study INT,
  credits INT
);

-- QUESTIONS
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  subject_id UUID NOT NULL REFERENCES subjects(id),

  text TEXT NOT NULL,
  image_url VARCHAR(255),
  explanation TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ANSWERS
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

  text VARCHAR(255) NOT NULL,
  image_url VARCHAR(255),

  is_correct BOOLEAN NOT NULL,
  position INT
);

-- QUIZ SESSIONS
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),

  status session_status DEFAULT 'ACTIVE',
  mode session_mode NOT NULL DEFAULT 'LEARNING',

  total_questions INT,
  correct_answers INT,

  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

-- USER ANSWERS
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES quiz_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),

  question_id UUID NOT NULL REFERENCES questions(id),
  selected_answer_id UUID REFERENCES answers(id),

  is_correct BOOLEAN NOT NULL,

  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BOOKMARKS
CREATE TABLE user_question_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES questions(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI EXPLANATIONS
CREATE TABLE ai_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  question_id UUID NOT NULL REFERENCES questions(id),
  user_id UUID REFERENCES users(id),

  content TEXT NOT NULL,
  sources TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA
INSERT INTO faculties (id, name, description) VALUES (
  gen_random_uuid(),
  'Facultatea de Medicină – UMF „Grigore T. Popa” Iași',
  'Una dintre cele mai vechi și prestigioase facultăți de medicină din România, înființată în 1879 în cadrul Universității de Medicină și Farmacie „Grigore T. Popa” din Iași. Oferă programe de studii de Medicină, Medicină Dentară și Farmacie, fiind acreditată ARACIS și recunoscută la nivel european pentru standardul ridicat al pregătirii clinice și al cercetării medicale.'
);

INSERT INTO subjects (id, name, description) VALUES (
  gen_random_uuid(),
  'Biochimie',
  'Studiul proceselor chimice care au loc în organismele vii: structura și metabolismul proteinelor, glucidelor, lipidelor și acizilor nucleici, enzimologie și bioenergetică.'
);

INSERT INTO faculty_subjects (id, faculty_id, subject_id, year_of_study, credits)
SELECT gen_random_uuid(), f.id, s.id, 2, 6
FROM faculties f, subjects s
WHERE f.name = 'Facultatea de Medicină – UMF „Grigore T. Popa” Iași'
  AND s.name = 'Biochimie';

-- Materii suplimentare pentru facultatea de Medicină Iași
INSERT INTO subjects (id, name, description) VALUES
  (gen_random_uuid(), 'Anatomie',
   'Studiul structurii corpului uman: sistemul osos, muscular, nervos, cardiovascular și organele interne, cu accent pe relațiile topografice și aplicațiile clinice.'),
  (gen_random_uuid(), 'Fiziologie',
   'Studiul funcționării normale a organismului: mecanismele celulare, fiziologia sistemelor cardiovascular, respirator, renal, nervos și endocrin, precum și homeostazia.'),
  (gen_random_uuid(), 'Histologie',
   'Studiul microscopic al țesuturilor: țesuturile epitelial, conjunctiv, muscular și nervos, organizarea lor în organe și corelațiile structură-funcție.'),
  (gen_random_uuid(), 'Microbiologie',
   'Studiul microorganismelor cu relevanță medicală: bacterii, virusuri, fungi și paraziți, mecanismele de patogenitate, imunitatea și diagnosticul de laborator.'),
  (gen_random_uuid(), 'Farmacologie',
   'Studiul medicamentelor: farmacocinetică, farmacodinamie, mecanisme de acțiune, clase terapeutice, reacții adverse și interacțiuni medicamentoase.');

-- Asocierea materiilor noi cu facultatea (an de studiu + credite)
INSERT INTO faculty_subjects (id, faculty_id, subject_id, year_of_study, credits)
SELECT gen_random_uuid(), f.id, s.id, v.year_of_study, v.credits
FROM faculties f
JOIN (VALUES
  ('Anatomie', 1, 8),
  ('Fiziologie', 2, 7),
  ('Histologie', 1, 5),
  ('Microbiologie', 2, 6),
  ('Farmacologie', 3, 6)
) AS v(subject_name, year_of_study, credits) ON TRUE
JOIN subjects s ON s.name = v.subject_name
WHERE f.name = 'Facultatea de Medicină – UMF „Grigore T. Popa” Iași';