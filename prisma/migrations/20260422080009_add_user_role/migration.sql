-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
