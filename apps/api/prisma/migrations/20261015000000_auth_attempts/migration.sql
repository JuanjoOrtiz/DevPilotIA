-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_attempts_scope_key_hash_created_at_idx" ON "auth_attempts"("scope", "key_hash", "created_at");

-- CreateIndex
CREATE INDEX "auth_attempts_created_at_idx" ON "auth_attempts"("created_at");
