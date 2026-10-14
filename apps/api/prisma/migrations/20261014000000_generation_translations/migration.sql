-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "translations" JSONB;
