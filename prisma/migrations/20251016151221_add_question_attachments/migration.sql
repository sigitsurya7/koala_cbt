-- Add attachment fields to Question
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "attachmentType" TEXT,
  ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
