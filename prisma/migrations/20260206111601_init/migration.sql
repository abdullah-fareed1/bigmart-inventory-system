-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "membershipTier" TEXT NOT NULL DEFAULT 'SILVER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("phoneNumber")
);

-- CreateTable
CREATE TABLE "CustomerPoint" (
    "id" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "transactionId" TEXT,
    "pointsChange" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "primaryUnit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUnitConversion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "conversionFactor" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "quantityAdded" DECIMAL(10,2) NOT NULL,
    "quantityRemaining" DECIMAL(10,2) NOT NULL,
    "measuringUnit" TEXT NOT NULL,
    "buyingPricePerUnit" DECIMAL(10,2) NOT NULL,
    "sellingPricePerUnit" DECIMAL(10,2) NOT NULL,
    "suppliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSupplierPayment" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockSupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReturned" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "refundMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "customerPhone" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "totalItemDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cartDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pointsRedeemed" INTEGER NOT NULL DEFAULT 0,
    "pointsRedeemedValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2),
    "changeGiven" DECIMAL(10,2),
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "saleDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "measuringUnit" TEXT NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "itemDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundReceiptNumber" TEXT NOT NULL,
    "originalTransactionId" TEXT NOT NULL,
    "customerPhone" TEXT,
    "refundDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundMethod" TEXT NOT NULL,
    "totalRefundAmount" DECIMAL(10,2) NOT NULL,
    "pointsDeducted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "originalTransactionItemId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantityReturned" DECIMAL(10,2) NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "isRestocked" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Customer_totalPoints_idx" ON "Customer"("totalPoints");

-- CreateIndex
CREATE INDEX "Customer_membershipTier_idx" ON "Customer"("membershipTier");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "CustomerPoint_customerPhone_idx" ON "CustomerPoint"("customerPhone");

-- CreateIndex
CREATE INDEX "CustomerPoint_createdAt_idx" ON "CustomerPoint"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_phoneNumber_key" ON "Supplier"("phoneNumber");

-- CreateIndex
CREATE INDEX "Supplier_phoneNumber_idx" ON "Supplier"("phoneNumber");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "ProductUnitConversion_productId_idx" ON "ProductUnitConversion"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitName_key" ON "ProductUnitConversion"("productId", "unitName");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_grnNumber_key" ON "Stock"("grnNumber");

-- CreateIndex
CREATE INDEX "Stock_productId_idx" ON "Stock"("productId");

-- CreateIndex
CREATE INDEX "Stock_supplierId_idx" ON "Stock"("supplierId");

-- CreateIndex
CREATE INDEX "Stock_isActive_idx" ON "Stock"("isActive");

-- CreateIndex
CREATE INDEX "Stock_quantityRemaining_idx" ON "Stock"("quantityRemaining");

-- CreateIndex
CREATE INDEX "Stock_suppliedDate_idx" ON "Stock"("suppliedDate");

-- CreateIndex
CREATE INDEX "Stock_paymentStatus_idx" ON "Stock"("paymentStatus");

-- CreateIndex
CREATE INDEX "Stock_productId_isActive_quantityRemaining_suppliedDate_idx" ON "Stock"("productId", "isActive", "quantityRemaining", "suppliedDate");

-- CreateIndex
CREATE INDEX "StockSupplierPayment_stockId_idx" ON "StockSupplierPayment"("stockId");

-- CreateIndex
CREATE INDEX "StockSupplierPayment_supplierId_idx" ON "StockSupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "StockSupplierPayment_paymentDate_idx" ON "StockSupplierPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierReturn_returnNumber_key" ON "SupplierReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "SupplierReturn_stockId_idx" ON "SupplierReturn"("stockId");

-- CreateIndex
CREATE INDEX "SupplierReturn_supplierId_idx" ON "SupplierReturn"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierReturn_returnDate_idx" ON "SupplierReturn"("returnDate");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receiptNumber_key" ON "Transaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "Transaction_receiptNumber_idx" ON "Transaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "Transaction_customerPhone_idx" ON "Transaction"("customerPhone");

-- CreateIndex
CREATE INDEX "Transaction_saleDateTime_idx" ON "Transaction"("saleDateTime");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "TransactionItem_transactionId_idx" ON "TransactionItem"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionItem_stockId_idx" ON "TransactionItem"("stockId");

-- CreateIndex
CREATE INDEX "TransactionItem_productId_idx" ON "TransactionItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundReceiptNumber_key" ON "Refund"("refundReceiptNumber");

-- CreateIndex
CREATE INDEX "Refund_originalTransactionId_idx" ON "Refund"("originalTransactionId");

-- CreateIndex
CREATE INDEX "Refund_refundDate_idx" ON "Refund"("refundDate");

-- CreateIndex
CREATE INDEX "RefundItem_refundId_idx" ON "RefundItem"("refundId");

-- CreateIndex
CREATE INDEX "RefundItem_originalTransactionItemId_idx" ON "RefundItem"("originalTransactionItemId");

-- AddForeignKey
ALTER TABLE "CustomerPoint" ADD CONSTRAINT "CustomerPoint_customerPhone_fkey" FOREIGN KEY ("customerPhone") REFERENCES "Customer"("phoneNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPoint" ADD CONSTRAINT "CustomerPoint_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSupplierPayment" ADD CONSTRAINT "StockSupplierPayment_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSupplierPayment" ADD CONSTRAINT "StockSupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerPhone_fkey" FOREIGN KEY ("customerPhone") REFERENCES "Customer"("phoneNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_customerPhone_fkey" FOREIGN KEY ("customerPhone") REFERENCES "Customer"("phoneNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_originalTransactionItemId_fkey" FOREIGN KEY ("originalTransactionItemId") REFERENCES "TransactionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
