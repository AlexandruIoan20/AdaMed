-- =============================================================================
-- seed_questions.sql
-- Echivalent SQL (PL/pgSQL) pentru seed-questions.js și seed-questions-test.js
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Funcție helper: rezolvă faculty_subject_id după numele materiei
--    (și opțional al facultății, necesar dacă materia apare la mai multe).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_faculty_subject_id(
    p_subject_name TEXT,
    p_faculty_name TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_count     INTEGER;
    v_id        INTEGER;
    v_faculties TEXT;
BEGIN
    SELECT COUNT(*), MIN(fs.id)
    INTO   v_count, v_id
    FROM   faculty_subjects fs
    JOIN   subjects  s ON s.id = fs.subject_id
    JOIN   faculties f ON f.id = fs.faculty_id
    WHERE  s.name = p_subject_name
      AND  (p_faculty_name IS NULL OR f.name = p_faculty_name);

    IF v_count = 0 THEN
        RAISE EXCEPTION
            'Materia "%%"%% nu e legată de nicio facultate (lipsește din faculty_subjects). Adaug-o întâi (vezi database/init.sql).',
            p_subject_name,
            CASE WHEN p_faculty_name IS NOT NULL
                 THEN ' la facultatea "' || p_faculty_name || '"'
                 ELSE ''
            END;
    END IF;

    IF v_count > 1 THEN
        SELECT string_agg('"' || f.name || '"', ', ')
        INTO   v_faculties
        FROM   faculty_subjects fs
        JOIN   subjects  s ON s.id = fs.subject_id
        JOIN   faculties f ON f.id = fs.faculty_id
        WHERE  s.name = p_subject_name;

        RAISE EXCEPTION
            'Materia "%%" e legată de mai multe facultăți (%%). Adaugă câmpul "faculty" în JSON pentru a alege facultatea.',
            p_subject_name, v_faculties;
    END IF;

    RETURN v_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Procedură: seed_questions
--    Echivalent pentru seed-questions.js (o singură materie).
--
--    Apel:
--      CALL seed_questions('{"subject":"Anatomie","questions":[...]}');
--    sau cu facultate explicită:
--      CALL seed_questions('{"subject":"Anatomie","faculty":"Medicină","questions":[...]}');
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE seed_questions(p_data JSONB)
LANGUAGE plpgsql AS $$
DECLARE
    v_subject_name       TEXT    := p_data->>'subject';
    v_faculty_name       TEXT    := p_data->>'faculty';   -- opțional
    v_faculty_subject_id INTEGER;
    v_question           JSONB;
    v_answer             JSONB;
    v_question_id        INTEGER;
    v_position           INTEGER;
    v_correct_count      INTEGER;
    v_inserted_q         INTEGER := 0;
    v_inserted_a         INTEGER := 0;
BEGIN
    -- Validare structură de bază
    IF v_subject_name IS NULL OR p_data->'questions' IS NULL THEN
        RAISE EXCEPTION
            'JSON trebuie să aibă forma { "subject": string, "questions": [...] }';
    END IF;

    -- Validare întrebări: 10 răspunsuri, exact 5 corecte
    FOR v_question IN SELECT value FROM jsonb_array_elements(p_data->'questions') LOOP
        IF jsonb_array_length(v_question->'answers') <> 10 THEN
            RAISE EXCEPTION
                'Întrebarea "%%" nu are exact 10 răspunsuri.',
                v_question->>'text';
        END IF;

        SELECT COUNT(*)
        INTO   v_correct_count
        FROM   jsonb_array_elements(v_question->'answers') a
        WHERE  (a->>'isCorrect')::boolean;

        IF v_correct_count <> 5 THEN
            RAISE EXCEPTION
                'Întrebarea "%%" trebuie să aibă exact 5 răspunsuri corecte (are %%).',
                v_question->>'text', v_correct_count;
        END IF;
    END LOOP;

    -- Rezolvă faculty_subject_id
    v_faculty_subject_id := resolve_faculty_subject_id(v_subject_name, v_faculty_name);

    -- Idempotent: șterge întrebările existente (answers cascade)
    DELETE FROM questions WHERE faculty_subject_id = v_faculty_subject_id;

    -- Inserare întrebări și răspunsuri
    FOR v_question IN SELECT value FROM jsonb_array_elements(p_data->'questions') LOOP

        INSERT INTO questions (faculty_subject_id, text, image_url, explanation)
        VALUES (
            v_faculty_subject_id,
            v_question->>'text',
            v_question->>'imageUrl',
            v_question->>'explanation'
        )
        RETURNING id INTO v_question_id;

        v_inserted_q := v_inserted_q + 1;
        v_position   := 0;

        FOR v_answer IN SELECT value FROM jsonb_array_elements(v_question->'answers') LOOP
            INSERT INTO answers (question_id, text, image_url, is_correct, position)
            VALUES (
                v_question_id,
                v_answer->>'text',
                v_answer->>'imageUrl',
                (v_answer->>'isCorrect')::boolean,
                v_position
            );
            v_position   := v_position + 1;
            v_inserted_a := v_inserted_a + 1;
        END LOOP;

    END LOOP;

    RAISE NOTICE 'OK: %% întrebări și %% răspunsuri inserate pentru materia "%%".',
        v_inserted_q, v_inserted_a, v_subject_name;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Procedură: seed_questions_multi
--    Echivalent pentru seed-questions-test.js (mai multe materii dintr-un
--    singur JSON).
--
--    Apel:
--      CALL seed_questions_multi('{"subjects":[{"subject":"Anatomie","questions":[...]},{"subject":"Fiziologie","questions":[...]}]}');
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE seed_questions_multi(p_data JSONB)
LANGUAGE plpgsql AS $$
DECLARE
    v_block              JSONB;
    v_subject_name       TEXT;
    v_faculty_name       TEXT;
    v_faculty_subject_id INTEGER;
    v_question           JSONB;
    v_answer             JSONB;
    v_question_id        INTEGER;
    v_position           INTEGER;
    v_correct_count      INTEGER;
    v_block_q            INTEGER;
    v_block_a            INTEGER;
    v_total_q            INTEGER := 0;
    v_total_a            INTEGER := 0;
    v_subjects_count     INTEGER;
BEGIN
    -- Validare structură de bază
    IF p_data->'subjects' IS NULL THEN
        RAISE EXCEPTION
            'JSON trebuie să aibă forma { "subjects": [ { "subject": string, "questions": [...] } ] }';
    END IF;

    v_subjects_count := jsonb_array_length(p_data->'subjects');

    -- Parcurge fiecare bloc de materie
    FOR v_block IN SELECT value FROM jsonb_array_elements(p_data->'subjects') LOOP

        v_subject_name := v_block->>'subject';
        v_faculty_name := v_block->>'faculty';  -- opțional
        v_block_q      := 0;
        v_block_a      := 0;

        IF v_subject_name IS NULL OR v_block->'questions' IS NULL THEN
            RAISE EXCEPTION
                'Fiecare element din "subjects" trebuie să aibă { "subject": string, "questions": [...] }.';
        END IF;

        -- Validare întrebări din bloc
        FOR v_question IN SELECT value FROM jsonb_array_elements(v_block->'questions') LOOP
            IF jsonb_array_length(v_question->'answers') <> 10 THEN
                RAISE EXCEPTION
                    'Materia "%%", întrebarea "%%" nu are exact 10 răspunsuri.',
                    v_subject_name, v_question->>'text';
            END IF;

            SELECT COUNT(*)
            INTO   v_correct_count
            FROM   jsonb_array_elements(v_question->'answers') a
            WHERE  (a->>'isCorrect')::boolean;

            IF v_correct_count <> 5 THEN
                RAISE EXCEPTION
                    'Materia "%%", întrebarea "%%" trebuie să aibă exact 5 răspunsuri corecte (are %%).',
                    v_subject_name, v_question->>'text', v_correct_count;
            END IF;
        END LOOP;

        -- Rezolvă faculty_subject_id
        v_faculty_subject_id := resolve_faculty_subject_id(v_subject_name, v_faculty_name);

        -- Idempotent: șterge întrebările existente (answers cascade)
        DELETE FROM questions WHERE faculty_subject_id = v_faculty_subject_id;

        -- Inserare întrebări și răspunsuri
        FOR v_question IN SELECT value FROM jsonb_array_elements(v_block->'questions') LOOP

            INSERT INTO questions (faculty_subject_id, text, image_url, explanation)
            VALUES (
                v_faculty_subject_id,
                v_question->>'text',
                v_question->>'imageUrl',
                v_question->>'explanation'
            )
            RETURNING id INTO v_question_id;

            v_block_q  := v_block_q + 1;
            v_position := 0;

            FOR v_answer IN SELECT value FROM jsonb_array_elements(v_question->'answers') LOOP
                INSERT INTO answers (question_id, text, image_url, is_correct, position)
                VALUES (
                    v_question_id,
                    v_answer->>'text',
                    v_answer->>'imageUrl',
                    (v_answer->>'isCorrect')::boolean,
                    v_position
                );
                v_position := v_position + 1;
                v_block_a  := v_block_a  + 1;
            END LOOP;

        END LOOP;

        v_total_q := v_total_q + v_block_q;
        v_total_a := v_total_a + v_block_a;
        RAISE NOTICE '  - "%%": %% întrebări, %% răspunsuri.', v_subject_name, v_block_q, v_block_a;

    END LOOP;

    RAISE NOTICE 'OK: %% întrebări și %% răspunsuri inserate pentru %% materii.',
        v_total_q, v_total_a, v_subjects_count;
END;
$$;


-- =============================================================================
-- EXEMPLE DE APEL
-- =============================================================================

-- ── Materie singulară (echivalent seed-questions.js) ──────────────────────────
/*
BEGIN;
CALL seed_questions($$
{
  "subject": "Anatomie",
  "questions": [
    {
      "text": "Care este osul cel mai lung din corpul uman?",
      "explanation": "Femurul este osul cel mai lung.",
      "answers": [
        { "text": "Femurul",   "isCorrect": true  },
        { "text": "Tibia",     "isCorrect": true  },
        { "text": "Humerusul", "isCorrect": true  },
        { "text": "Radiusul",  "isCorrect": true  },
        { "text": "Ulna",      "isCorrect": true  },
        { "text": "Fibula",    "isCorrect": false },
        { "text": "Clavicula", "isCorrect": false },
        { "text": "Scapula",   "isCorrect": false },
        { "text": "Sternul",   "isCorrect": false },
        { "text": "Patelă",    "isCorrect": false }
      ]
    }
  ]
}
$$);
COMMIT;
*/

-- ── Mai multe materii (echivalent seed-questions-test.js) ─────────────────────
/*
BEGIN;
CALL seed_questions_multi($$
{
  "subjects": [
    {
      "subject": "Anatomie",
      "questions": [ ... ]
    },
    {
      "subject": "Fiziologie",
      "faculty": "Medicină",
      "questions": [ ... ]
    }
  ]
}
$$);
COMMIT;
*/