-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'AI_AGENT';
ALTER TYPE "NodeType" ADD VALUE 'AI_MODEL';
ALTER TYPE "NodeType" ADD VALUE 'AI_TOOL';

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "parentNodeId" TEXT;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
