-- CreateTable
CREATE TABLE "SupplierCreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierReturnId" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "remainingAmount" DECIMAL(10,2) NOT NULL,
    "isFullyUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNoteUsage" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "amountUsed" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNoteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_creditNoteNumber_key" ON "SupplierCreditNote"("creditNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_supplierReturnId_key" ON "SupplierCreditNote"("supplierReturnId");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_supplierId_idx" ON "SupplierCreditNote"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_isFullyUsed_idx" ON "SupplierCreditNote"("isFullyUsed");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_supplierId_isFullyUsed_idx" ON "SupplierCreditNote"("supplierId", "isFullyUsed");

-- CreateIndex
CREATE INDEX "CreditNoteUsage_creditNoteId_idx" ON "CreditNoteUsage"("creditNoteId");

-- CreateIndex
CREATE INDEX "CreditNoteUsage_stockId_idx" ON "CreditNoteUsage"("stockId");

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_supplierReturnId_fkey" FOREIGN KEY ("supplierReturnId") REFERENCES "SupplierReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteUsage" ADD CONSTRAINT "CreditNoteUsage_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "SupplierCreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteUsage" ADD CONSTRAINT "CreditNoteUsage_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
