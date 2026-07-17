#!/usr/bin/env node

// Citește scripts/../questions_test.json și populează tabelele `questions` +
// `answers` pentru fiecare materie din câmpul "subjects" al JSON-ului.
//
// Spre deosebire de seed-questions.js (o singură materie), acest script
// parcurge mai multe materii dintr-un singur fișier de test.
//
// Formatul așteptat:
//   {
//     "subjects": [
//       { "subject": "Anatomie",  "questions": [ ... ] },
//       { "subject": "Fiziologie", "questions": [ ... ] },
//       ...
//     ]
//   }
//
// Rulare:
//   cd scripts && npm install && npm run seed-questions-test
//
// Necesită ca baza de date (Postgres) să fie pornită și accesibilă (ex. prin
// docker compose up -d db) și ca fiecare materie din "subject" să existe deja
// în tabela `subjects`.

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..");
const QUESTIONS_FILE = path.join(ROOT_DIR, "questions_test.json");

function loadEnv(envPath) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

// Acceptă atât noul format multi-materie { "subjects": [...] }, cât și vechiul
// format cu o singură materie { "subject": ..., "questions": [...] }.
function normalizeSubjects(data) {
  if (Array.isArray(data.subjects)) return data.subjects;
  if (data.subject && Array.isArray(data.questions)) {
    return [{ subject: data.subject, questions: data.questions }];
  }
  throw new Error(
    'questions_test.json trebuie să aibă forma { "subjects": [ { "subject": string, "questions": [...] } ] }',
  );
}

function validate(subjects) {
  for (const block of subjects) {
    if (!block.subject || !Array.isArray(block.questions)) {
      throw new Error('Fiecare element din "subjects" trebuie să aibă { "subject": string, "questions": [...] }.');
    }
    for (const [i, q] of block.questions.entries()) {
      const where = `Materia "${block.subject}", întrebarea ${i + 1} ("${q.text}")`;
      if (!Array.isArray(q.answers) || q.answers.length !== 10) {
        throw new Error(`${where} nu are exact 10 răspunsuri.`);
      }
      const correctCount = q.answers.filter((a) => a.isCorrect).length;
      if (correctCount !== 5) {
        throw new Error(`${where} trebuie să aibă exact 5 răspunsuri corecte (are ${correctCount}).`);
      }
    }
  }
}

// Grilele atârnă de perechea (facultate, materie) = faculty_subjects, nu de
// materia globală. Rezolvăm faculty_subject_id după numele materiei și, opțional,
// numele facultății (necesar doar dacă materia e legată de mai multe facultăți).
async function resolveFacultySubjectId(client, subjectName, facultyName) {
  const params = [subjectName];
  let sql =
    "SELECT fs.id, f.name AS faculty_name FROM faculty_subjects fs " +
    "JOIN subjects s ON s.id = fs.subject_id " +
    "JOIN faculties f ON f.id = fs.faculty_id " +
    "WHERE s.name = $1";
  if (facultyName) {
    sql += " AND f.name = $2";
    params.push(facultyName);
  }

  const result = await client.query(sql, params);
  if (result.rowCount === 0) {
    throw new Error(
      `Materia "${subjectName}"${facultyName ? ` la facultatea "${facultyName}"` : ""} nu e legată de nicio facultate ` +
        "(lipsește din faculty_subjects). Adaug-o întâi (vezi database/init.sql).",
    );
  }
  if (result.rowCount > 1) {
    const faculties = result.rows.map((r) => `"${r.faculty_name}"`).join(", ");
    throw new Error(
      `Materia "${subjectName}" e legată de mai multe facultăți (${faculties}). ` +
        'Adaugă câmpul "faculty" în blocul materiei pentru a alege facultatea.',
    );
  }
  return result.rows[0].id;
}

async function main() {
  const env = { ...loadEnv(path.join(ROOT_DIR, ".env")), ...process.env };

  if (!fs.existsSync(QUESTIONS_FILE)) {
    throw new Error(`Nu am găsit ${QUESTIONS_FILE}`);
  }

  const data = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf-8"));
  const subjects = normalizeSubjects(data);
  validate(subjects);

  const client = new Client({
    host: env.DB_HOST_EXTERNAL || "localhost",
    port: Number(env.POSTGRES_PORT || 5432),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    let totalQuestions = 0;
    let totalAnswers = 0;

    for (const block of subjects) {
      const facultySubjectId = await resolveFacultySubjectId(client, block.subject, block.faculty);

      // Idempotent: șterge întrebările existente ale legăturii înainte de reseed
      // (answers se șterg automat prin ON DELETE CASCADE pe question_id).
      await client.query("DELETE FROM questions WHERE faculty_subject_id = $1", [facultySubjectId]);

      let insertedQuestions = 0;
      let insertedAnswers = 0;

      for (const q of block.questions) {
        const questionResult = await client.query(
          `INSERT INTO questions (faculty_subject_id, text, image_url, explanation)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [facultySubjectId, q.text, q.imageUrl ?? null, q.explanation ?? null],
        );
        const questionId = questionResult.rows[0].id;
        insertedQuestions += 1;

        for (const [position, answer] of q.answers.entries()) {
          await client.query(
            `INSERT INTO answers (question_id, text, image_url, is_correct, position)
             VALUES ($1, $2, $3, $4, $5)`,
            [questionId, answer.text, answer.imageUrl ?? null, answer.isCorrect, position],
          );
          insertedAnswers += 1;
        }
      }

      totalQuestions += insertedQuestions;
      totalAnswers += insertedAnswers;
      console.log(`  - "${block.subject}": ${insertedQuestions} întrebări, ${insertedAnswers} răspunsuri.`);
    }

    await client.query("COMMIT");
    console.log(`OK: ${totalQuestions} întrebări și ${totalAnswers} răspunsuri inserate pentru ${subjects.length} materii.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed-ul a eșuat:", err.message);
  process.exit(1);
});
