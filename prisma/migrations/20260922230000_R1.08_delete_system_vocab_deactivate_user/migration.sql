-- R1.08: DELETE system Vocabulary rows + deactivate system user
-- System rows đã được backfill sang VocabSeed (R1.05) — an toàn để xóa
-- System user giữ row (FK history), chỉ set isActive=false

DELETE FROM "Vocabulary" WHERE "idUser" = 'c73c7a63-ca7e-4d64-9469-41cb8ce59d88';

UPDATE "User" SET "isActive" = false WHERE email = 'system@ielts-app.local';
