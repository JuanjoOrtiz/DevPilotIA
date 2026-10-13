-- AlterEnum
ALTER TYPE "GenerationStatus" ADD VALUE 'needs_clarification' BEFORE 'completed';

-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "answered_at" TIMESTAMPTZ(3),
ADD COLUMN     "clarification_answers" JSONB,
ADD COLUMN     "clarifying_questions" JSONB;

-- CreateIndex
CREATE INDEX "generations_created_at_idx" ON "generations"("created_at");
