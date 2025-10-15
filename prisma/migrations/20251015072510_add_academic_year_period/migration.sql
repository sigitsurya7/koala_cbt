-- DropIndex
DROP INDEX "public"."Question_schoolId_subjectId_idx";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "periodId" TEXT;

-- CreateIndex
CREATE INDEX "Question_schoolId_subjectId_academicYearId_periodId_idx" ON "Question"("schoolId", "subjectId", "academicYearId", "periodId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
