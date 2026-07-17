#!/usr/bin/env node

// Citește scripts/../questions.json și populează tabelele `questions` + `answers`
// pentru materia indicată în câmpul "subject" din JSON.
//
// Rulare:
//   cd scripts && npm install && npm run seed-questions
//
// Necesită ca baza de date (Postgres) să fie pornită și accesibilă (ex. prin
// docker compose up -d db) și ca materia din "subject" să existe deja în
// tabela `subjects`.

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..");
const QUESTIONS_FILE = path.join(ROOT_DIR, "questions.json");

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
        'Adaugă câmpul "faculty" în JSON pentru a alege facultatea.',
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
  if (!data.subject || !Array.isArray(data.questions)) {
    throw new Error('questions.json trebuie să aibă forma { "subject": string, "questions": [...] }');
  }

  for (const [i, q] of data.questions.entries()) {
    if (!Array.isArray(q.answers) || q.answers.length !== 10) {
      throw new Error(`Întrebarea ${i + 1} ("${q.text}") nu are exact 10 răspunsuri.`);
    }
    const correctCount = q.answers.filter((a) => a.isCorrect).length;
    if (correctCount !== 5) {
      throw new Error(`Întrebarea ${i + 1} ("${q.text}") trebuie să aibă exact 5 răspunsuri corecte (are ${correctCount}).`);
    }
  }

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

    const facultySubjectId = await resolveFacultySubjectId(client, data.subject, data.faculty);

    // Idempotent: șterge întrebările existente ale legăturii înainte de reseed
    // (answers se șterg automat prin ON DELETE CASCADE pe question_id).
    await client.query("DELETE FROM questions WHERE faculty_subject_id = $1", [facultySubjectId]);

    let insertedQuestions = 0;
    let insertedAnswers = 0;

    for (const q of data.questions) {
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

    await client.query("COMMIT");
    console.log(`OK: ${insertedQuestions} întrebări și ${insertedAnswers} răspunsuri inserate pentru materia "${data.subject}".`);
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
