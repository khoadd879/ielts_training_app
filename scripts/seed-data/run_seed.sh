#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/compose.yaml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run this script." >&2
  exit 1
fi

seed_exams() {
  echo "Seeding exam data..."
  local seed_dir="${REPO_ROOT}/deploy/seeds"

  # Auto-discover exam seed files (stable order).
  local -a exam_seeds=()
  mapfile -t exam_seeds < <(
    find "${seed_dir}" -maxdepth 1 -type f -name '*.sql' -print \
      | LC_ALL=C sort
  )

  if (( ${#exam_seeds[@]} == 0 )); then
    echo "No exam seed files found in: ${seed_dir}" >&2
    exit 1
  fi

  echo "Found ${#exam_seeds[@]} SQL files to seed:"
  for f in "${exam_seeds[@]}"; do
    echo "  - $(basename "$f")"
  done
  echo ""

  # Apply each SQL file using docker exec for cross-platform compatibility
  for seed_file in "${exam_seeds[@]}"; do
    if [[ ! -f "${seed_file}" ]]; then
      echo "Missing exam seed file: ${seed_file}" >&2
      exit 1
    fi
    
    echo "Applying: $(basename "${seed_file}")..."
    # Use docker exec to run psql inside the container (works on Windows/Linux/Mac)
    docker compose -f "${COMPOSE_FILE}" exec -T exam-database \
      psql -U exam -d exam-db < "${seed_file}" 2>&1 \
      | grep -E "^(BEGIN|COMMIT|DO|INSERT|DELETE|ERROR|psql:)" || true
  done
  
  echo "✓ All exam seeds applied!"
}

seed_vocabulary() {
  echo "Seeding vocabulary data..."
  docker compose -f "${COMPOSE_FILE}" exec -T vocabulary-database \
    psql -U vocabulary -d vocabulary-db <<'VOCAB_SQL'
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Remove previous demo decks and their dependent data.
DELETE FROM deck WHERE "Slug" LIKE 'demo-deck-%';

DO $$
DECLARE
    owner_pool uuid[] := ARRAY[
        '11111111-1111-1111-1111-111111111111'::uuid,
        '22222222-2222-2222-2222-222222222222'::uuid,
        '33333333-3333-3333-3333-333333333333'::uuid,
        '44444444-4444-4444-4444-444444444444'::uuid,
        '55555555-5555-5555-5555-555555555555'::uuid,
        '66666666-6666-6666-6666-666666666666'::uuid
    ];
    categories text[] := ARRAY['Academic', 'Business', 'Travel', 'Daily Life', 'Idioms'];
    word_bank text[] := ARRAY[
        'abandon','benevolent','candid','diligent','eloquent','fathom','gregarious','humble','illuminate','jubilant',
        'kinetic','lucid','meticulous','nostalgia','ornate','pragmatic','quaint','resilient','serene','tenacious',
        'urbane','vivid','whimsical','yearn','zenith','alleviate','bolster','contemplate','deride','embark',
        'forge','galvanize','herald','immerse','juggle','kindle','lament','mediate','nurture','optimize',
        'pioneer','quell','revitalize','safeguard','taper','uplift','venture','wane','yoke','zeal'
    ];
    deck_idx int;
    card_idx int;
    cards_per_deck int := 12;
    deck_id uuid;
    owner_id uuid;
    word text;
BEGIN
    FOR deck_idx IN 1..50 LOOP
        deck_id := uuid_generate_v4();
        owner_id := owner_pool[((deck_idx - 1) % array_length(owner_pool, 1)) + 1];

        INSERT INTO deck ("Id", "Slug", "UserId", "Title", "DescriptionMd", "Category", "Status", "CreatedAt", "UpdatedAt")
        VALUES (
            deck_id,
            format('demo-deck-%s', lpad(deck_idx::text, 3, '0')),
            owner_id,
            format('Demo Vocabulary Deck #%s', deck_idx),
            format('### Deck %s%sA curated list of thematic vocabulary words for bulk testing.', deck_idx, chr(10)),
            categories[((deck_idx - 1) % array_length(categories, 1)) + 1],
            CASE WHEN deck_idx % 3 = 0 THEN 'PUBLISHED' ELSE 'DRAFT' END,
            now() - make_interval(days => deck_idx),
            now()
        );

        FOR card_idx IN 1..cards_per_deck LOOP
            word := word_bank[((deck_idx + card_idx - 2) % array_length(word_bank, 1)) + 1];
            INSERT INTO card ("Id", "DeckId", "Idx", "FrontMd", "BackMd", "HintMd")
            VALUES (
                uuid_generate_v4(),
                deck_id,
                card_idx,
                format('**%s**%sUse it in your own sentence.', initcap(word), chr(10)),
                format('*Definition:* %s meaning tailored for deck %s card %s.%s*Example:* Learners who %s ideas thrive in discussions.',
                       initcap(word),
                       deck_idx,
                       card_idx,
                       chr(10),
                       word),
                format('Picture the word "%s" in a vivid scene to strengthen memory.', word)
            );
        END LOOP;
    END LOOP;
END
$$ LANGUAGE plpgsql;
VOCAB_SQL
}

seed_exams
seed_vocabulary
echo "Seed completed successfully."
