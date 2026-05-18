-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DoctorRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paraCode" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentCid" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorRequest_userId_key" ON "DoctorRequest"("userId");

-- AddForeignKey
ALTER TABLE "DoctorRequest" ADD CONSTRAINT "DoctorRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
