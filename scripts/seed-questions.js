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

    const subjectResult = await client.query("SELECT id FROM subjects WHERE name = $1", [data.subject]);
    if (subjectResult.rowCount === 0) {
      throw new Error(`Materia "${data.subject}" nu există în tabela subjects. Adaug-o întâi (vezi database/init.sql).`);
    }
    const subjectId = subjectResult.rows[0].id;

    // Idempotent: șterge întrebările existente ale materiei înainte de reseed
    // (answers se șterg automat prin ON DELETE CASCADE pe question_id).
    await client.query("DELETE FROM questions WHERE subject_id = $1", [subjectId]);

    let insertedQuestions = 0;
    let insertedAnswers = 0;

    for (const q of data.questions) {
      const questionResult = await client.query(
        `INSERT INTO questions (subject_id, text, image_url, explanation)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [subjectId, q.text, q.imageUrl ?? null, q.explanation ?? null],
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
