-- RF-EDI-03: idioma de la versión de la IA mientras la vigente es una edición.
ALTER TABLE "generations" ADD COLUMN "ai_language" TEXT;
