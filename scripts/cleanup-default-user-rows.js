// One-shot cleanup: remove rows with idUser='default-user' from
// UserDailyTaskCompletion and UserStudyPreference. Idempotent.
//
// Reason: study-planner.controller.ts used to fall back to the literal
// string 'default-user' when the (never-populated) x-user-id header was
// missing. After the fix, any pre-existing rows under that idUser are
// orphaned garbage — keep no trace.
//
// Run: node -r dotenv/config scripts/cleanup-default-user-rows.js
//      (dotenv loaded from the repo root .env)

const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

(async () => {
  try {
    const completion = await p.userDailyTaskCompletion.deleteMany({
      where: { idUser: 'default-user' },
    });
    const preference = await p.userStudyPreference.deleteMany({
      where: { idUser: 'default-user' },
    });
    console.log(
      `[cleanup-default-user-rows] completion=${completion.count}, preference=${preference.count}`,
    );
  } catch (err) {
    console.error('[cleanup-default-user-rows] failed:', err);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
})();
