-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "canBeSplit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splitSellingPrice" DECIMAL(10,2),
ADD COLUMN     "splitUnit" TEXT,
ADD COLUMN     "unitsPerWhole" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "soldInSplitUnit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splitUnitName" TEXT,
ADD COLUMN     "splitUnitsPerWhole" DECIMAL(10,4);
