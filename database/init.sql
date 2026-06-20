CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE user_roles AS ENUM ('USER', 'ADMIN');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'FINISHED', 'ABANDONED');

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
INSERT INTO faculties (name, description) VALUES (
  'Facultatea de Medicină – UMF „Grigore T. Popa” Iași',
  'Una dintre cele mai vechi și prestigioase facultăți de medicină din România, înființată în 1879 în cadrul Universității de Medicină și Farmacie „Grigore T. Popa” din Iași. Oferă programe de studii de Medicină, Medicină Dentară și Farmacie, fiind acreditată ARACIS și recunoscută la nivel european pentru standardul ridicat al pregătirii clinice și al cercetării medicale.'
);