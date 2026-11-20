/*
  Warnings:

  - You are about to drop the column `codeHash` on the `Invite` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Invite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Invite` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Invite_codeHash_key";

-- AlterTable
ALTER TABLE "Invite" DROP COLUMN "codeHash",
ADD COLUMN     "code" VARCHAR(16) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
