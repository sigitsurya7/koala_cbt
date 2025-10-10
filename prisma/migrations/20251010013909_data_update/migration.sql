/*
  Warnings:

  - A unique constraint covering the columns `[userId,schoolId]` on the table `StaffDetail` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,schoolId]` on the table `TeacherDetail` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."StaffDetail_userId_key";

-- DropIndex
DROP INDEX "public"."TeacherDetail_userId_key";

-- CreateIndex
CREATE INDEX "Attempt_schoolId_examId_studentId_status_idx" ON "Attempt"("schoolId", "examId", "studentId", "status");

-- CreateIndex
CREATE INDEX "Class_schoolId_departmentId_idx" ON "Class"("schoolId", "departmentId");

-- CreateIndex
CREATE INDEX "Department_schoolId_name_idx" ON "Department"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Exam_schoolId_periodId_idx" ON "Exam"("schoolId", "periodId");

-- CreateIndex
CREATE INDEX "Menu_parentId_order_idx" ON "Menu"("parentId", "order");

-- CreateIndex
CREATE INDEX "Period_schoolId_academicYearId_idx" ON "Period"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "Question_schoolId_subjectId_idx" ON "Question"("schoolId", "subjectId");

-- CreateIndex
CREATE INDEX "Room_schoolId_name_idx" ON "Room"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDetail_userId_schoolId_key" ON "StaffDetail"("userId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherDetail_userId_schoolId_key" ON "TeacherDetail"("userId", "schoolId");

-- CreateIndex
CREATE INDEX "UserRole_userId_schoolId_idx" ON "UserRole"("userId", "schoolId");

-- CreateIndex
CREATE INDEX "UserSchool_userId_schoolId_idx" ON "UserSchool"("userId", "schoolId");
