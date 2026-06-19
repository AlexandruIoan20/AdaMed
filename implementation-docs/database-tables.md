Enum user_roles {
  USER
  ADMIN
}

Enum session_status {
  ACTIVE
  FINISHED
  ABANDONED
}

Table users {
  id uuid [pk, default: `gen_random_uuid()`]

  username varchar(30) [not null, unique]
  first_name varchar(50) [not null]
  last_name varchar(50) [not null]

  email varchar(100) [not null, unique]
  email_verified boolean [default: false]

  password_hash varchar(255) [not null]

  faculty_id uuid [not null, ref: > faculties.id]
  year_of_study int [not null, default: 1]

  role user_roles [not null, default: 'USER']

  created_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table faculties {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(100) [not null, unique]
  description varchar(500)
}

Table subjects {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(100) [not null, unique]
  description varchar(255)
}

Table faculty_subjects {
  id uuid [pk, default: `gen_random_uuid()`]

  faculty_id uuid [not null, ref: > faculties.id]
  subject_id uuid [not null, ref: > subjects.id]

  year_of_study int
  credits int
}

Table questions {
  id uuid [pk, default: `gen_random_uuid()`]

  subject_id uuid [not null, ref: > subjects.id]

  text text [not null]
  image_url varchar(255)

  explanation text

  created_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table answers {
  id uuid [pk, default: `gen_random_uuid()`]

  question_id uuid [not null, ref: > questions.id]

  text varchar(255) [not null]
  image_url varchar(255)

  is_correct boolean [not null]

  position int
}

Table quiz_sessions {
  id uuid [pk, default: `gen_random_uuid()`]

  user_id uuid [not null, ref: > users.id]
  subject_id uuid [ref: > subjects.id]

  status session_status [default: 'ACTIVE']

  total_questions int
  correct_answers int

  started_at timestamp [default: `CURRENT_TIMESTAMP`]
  finished_at timestamp
}

Table user_answers {
  id uuid [pk, default: `gen_random_uuid()`]

  session_id uuid [not null, ref: > quiz_sessions.id]
  user_id uuid [not null, ref: > users.id]

  question_id uuid [not null, ref: > questions.id]
  selected_answer_id uuid [ref: > answers.id]

  is_correct boolean [not null]

  answered_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table user_question_bookmarks {
  id uuid [pk, default: `gen_random_uuid()`]

  user_id uuid [not null, ref: > users.id]
  question_id uuid [not null, ref: > questions.id]

  created_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table ai_explanations {
  id uuid [pk, default: `gen_random_uuid()`]

  question_id uuid [not null, ref: > questions.id]
  user_id uuid [ref: > users.id]

  content text [not null]

  sources text

  created_at timestamp [default: `CURRENT_TIMESTAMP`]
}

https://dbdiagram.io/d/6a01d2687a923b94727b62f3