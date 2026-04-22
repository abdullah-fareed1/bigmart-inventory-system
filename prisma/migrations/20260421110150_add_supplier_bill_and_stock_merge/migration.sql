-- DropForeignKey
ALTER TABLE "StockSupplierPayment" DROP CONSTRAINT "StockSupplierPayment_supplierId_fkey";

-- AlterTable
ALTER TABLE "CreditNoteUsage" ADD COLUMN     "billId" TEXT;

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "supplierBillId" TEXT;

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierInvoiceRef" TEXT,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_billNumber_key" ON "SupplierBill"("billNumber");

-- CreateIndex
CREATE INDEX "SupplierBill_supplierId_idx" ON "SupplierBill"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierBill_paymentStatus_idx" ON "SupplierBill"("paymentStatus");

-- CreateIndex
CREATE INDEX "SupplierBill_createdAt_idx" ON "SupplierBill"("createdAt");

-- CreateIndex
CREATE INDEX "SupplierBillPayment_billId_idx" ON "SupplierBillPayment"("billId");

-- CreateIndex
CREATE INDEX "SupplierBillPayment_supplierId_idx" ON "SupplierBillPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierBillPayment_paymentDate_idx" ON "SupplierBillPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "CreditNoteUsage_billId_idx" ON "CreditNoteUsage"("billId");

-- CreateIndex
CREATE INDEX "Stock_supplierBillId_idx" ON "Stock"("supplierBillId");

-- CreateIndex
CREATE INDEX "Stock_productId_supplierId_buyingPricePerUnit_sellingPriceP_idx" ON "Stock"("productId", "supplierId", "buyingPricePerUnit", "sellingPricePerUnit", "isActive");

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillPayment" ADD CONSTRAINT "SupplierBillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
