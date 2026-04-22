// Location: prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ==========================================
  // 1. CREATE ADMIN USER
  // ==========================================
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { email: "admin@bigmart.lk" },
    update: {},
    create: {
      email: "admin@bigmart.lk",
      password: hashedPassword,
      name: "Admin User",
    },
  });
  console.log("✅ Admin created (admin@bigmart.lk / admin123)");

  // ==========================================
  // 2. CREATE SHOP SETTINGS
  // ==========================================
  await prisma.shopSettings.upsert({
    where: { id: "shop-settings" },
    update: { shopName: "Bigmart Textiles" },
    create: {
      id: "shop-settings",
      shopName: "Bigmart Textiles",
      address: "89, Colombo Road, Peradeniya",
      phone: "0766655366",
      email: "info@bigmart.lk",
    },
  });
  console.log("✅ Shop settings created (Bigmart Textiles)");

  // ==========================================
  // 3. INITIALIZE COUNTERS
  // ==========================================
  await Promise.all([
    prisma.counter.upsert({
      where: { id: "receipt" },
      update: {},
      create: { id: "receipt", currentValue: 0 },
    }),
    prisma.counter.upsert({
      where: { id: "refund" },
      update: {},
      create: { id: "refund", currentValue: 0 },
    }),
    prisma.counter.upsert({
      where: { id: "grn" },
      update: {},
      create: { id: "grn", currentValue: 0 },
    }),
    prisma.counter.upsert({
      where: { id: "grn_return" },
      update: {},
      create: { id: "grn_return", currentValue: 0 },
    }),
    prisma.counter.upsert({
      where: { id: "credit_note" },
      update: {},
      create: { id: "credit_note", currentValue: 0 },
    }),
    // NEW: Supplier Bill counter
    prisma.counter.upsert({
      where: { id: "supplier_bill" },
      update: {},
      create: { id: "supplier_bill", currentValue: 0 },
    }),
  ]);
  console.log("✅ Counters initialized (including supplier_bill)");

  // ==========================================
  // 4. CREATE CATEGORIES
  // ==========================================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Fabric" },
      update: {},
      create: { name: "Fabric" },
    }),
    prisma.category.upsert({
      where: { name: "Premium" },
      update: {},
      create: { name: "Premium" },
    }),
    prisma.category.upsert({
      where: { name: "Accessories" },
      update: {},
      create: { name: "Accessories" },
    }),
    prisma.category.upsert({
      where: { name: "Lining" },
      update: {},
      create: { name: "Lining" },
    }),
  ]);
  console.log("✅ Categories created");

  // ==========================================
  // 5. CREATE SUPPLIERS
  // ==========================================
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { phoneNumber: "0771111111" },
      update: {},
      create: {
        name: "ABC Textiles",
        phoneNumber: "0771111111",
        notes: "Primary supplier for chiffon and silk",
      },
    }),
    prisma.supplier.upsert({
      where: { phoneNumber: "0772222222" },
      update: {},
      create: {
        name: "XYZ Fabrics",
        phoneNumber: "0772222222",
        notes: "Cotton and linen supplier",
      },
    }),
    prisma.supplier.upsert({
      where: { phoneNumber: "0773333333" },
      update: {},
      create: {
        name: "Premium Silks Ltd",
        phoneNumber: "0773333333",
        notes: "High-end silk fabrics",
      },
    }),
  ]);
  console.log("✅ Suppliers created");

  // ==========================================
  // 5.5 CLEANUP OLD SEED DATA (for re-runs)
  // ==========================================
  await prisma.creditNoteUsage.deleteMany({});
  await prisma.supplierCreditNote.deleteMany({});
  await prisma.supplierReturn.deleteMany({});
  await prisma.supplierBillPayment.deleteMany({});
  await prisma.stockSupplierPayment.deleteMany({});
  await prisma.refundItem.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.transactionItem.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.customerPoint.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.supplierBill.deleteMany({});
  await prisma.productUnitConversion.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  console.log("🧹 Cleaned old seed data");

  // ==========================================
  // 6. CREATE PRODUCTS
  // ==========================================
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Blue Chiffon Fabric",
        description: "Lightweight chiffon fabric in royal blue",
        categoryId: categories[0].id,
        primaryUnit: "METERS",
      },
    }),
    prisma.product.create({
      data: {
        name: "Cotton Blend",
        description: "Soft cotton blend fabric",
        categoryId: categories[0].id,
        primaryUnit: "METERS",
      },
    }),
    prisma.product.create({
      data: {
        name: "Silk Premium",
        description: "High-quality pure silk",
        categoryId: categories[1].id,
        primaryUnit: "METERS",
      },
    }),
    prisma.product.create({
      data: {
        name: "Polyester Mix",
        description: "Durable polyester blend",
        categoryId: categories[0].id,
        primaryUnit: "METERS",
      },
    }),
    prisma.product.create({
      data: {
        name: "Button Set Gold",
        description: "Set of 10 gold buttons",
        categoryId: categories[2].id,
        primaryUnit: "PACKETS",
      },
    }),
  ]);
  console.log("✅ Products created");

  // ==========================================
  // 7. CREATE SUPPLIER BILLS + STOCKS
  // ==========================================

  // --- BILL 1: ABC Textiles, multi-product delivery, PAID ---
  // Blue Chiffon (50m @ 400) + Polyester Mix (75m @ 150) = 20,000 + 11,250 = 31,250
  const bill1 = await prisma.supplierBill.create({
    data: {
      billNumber: "SB-00001",
      supplierId: suppliers[0].id,
      supplierInvoiceRef: "ABT-INV-2024-001",
      totalCost: 31250,
      amountPaid: 31250,
      paymentStatus: "PAID",
      notes: "First bulk delivery from ABC Textiles",
    },
  });

  const stock1 = await prisma.stock.create({
    data: {
      grnNumber: "GRN-00001",
      productId: products[0].id,
      supplierId: suppliers[0].id,
      supplierBillId: bill1.id,
      quantityAdded: 50,
      quantityRemaining: 45.5,  // some sold
      measuringUnit: "METERS",
      buyingPricePerUnit: 400,
      sellingPricePerUnit: 500,
      paymentStatus: "PAID",
      amountPaid: 20000,
      totalCost: 20000,
    },
  });

  const stock4 = await prisma.stock.create({
    data: {
      grnNumber: "GRN-00004",
      productId: products[3].id,
      supplierId: suppliers[0].id,
      supplierBillId: bill1.id,
      quantityAdded: 75,
      quantityRemaining: 75,    // untouched
      measuringUnit: "METERS",
      buyingPricePerUnit: 150,
      sellingPricePerUnit: 250,
      paymentStatus: "PAID",
      amountPaid: 11250,
      totalCost: 11250,
    },
  });

  // Record payment for bill 1
  await prisma.supplierBillPayment.create({
    data: {
      billId: bill1.id,
      supplierId: suppliers[0].id,
      amountPaid: 31250,
      paymentMethod: "CASH",
      notes: "Full payment on delivery",
    },
  });

  // --- BILL 2: XYZ Fabrics, multi-product delivery, PARTIAL ---
  // Cotton Blend (100m @ 200) + Button Set Gold (30pkt @ 100) = 20,000 + 3,000 = 23,000
  // Paid 10,000 upfront
  const bill2 = await prisma.supplierBill.create({
    data: {
      billNumber: "SB-00002",
      supplierId: suppliers[1].id,
      supplierInvoiceRef: "XYZ-INV-2024-045",
      totalCost: 23000,
      amountPaid: 10000,
      paymentStatus: "PARTIAL",
      notes: "XYZ batch delivery - partial payment agreed",
    },
  });

  const stock2 = await prisma.stock.create({
    data: {
      grnNumber: "GRN-00002",
      productId: products[1].id,
      supplierId: suppliers[1].id,
      supplierBillId: bill2.id,
      quantityAdded: 100,
      quantityRemaining: 85,    // some sold
      measuringUnit: "METERS",
      buyingPricePerUnit: 200,
      sellingPricePerUnit: 300,
      paymentStatus: "PARTIAL",
      amountPaid: 8696,         // proportional: 20000/23000 * 10000
      totalCost: 20000,
    },
  });

  const stock5 = await prisma.stock.create({
    data: {
      grnNumber: "GRN-00005",
      productId: products[4].id,
      supplierId: suppliers[1].id,
      supplierBillId: bill2.id,
      quantityAdded: 30,
      quantityRemaining: 28,    // some sold
      measuringUnit: "PACKETS",
      buyingPricePerUnit: 100,
      sellingPricePerUnit: 180,
      paymentStatus: "PARTIAL",
      amountPaid: 1304,         // proportional: 3000/23000 * 10000
      totalCost: 3000,
    },
  });

  // Record initial payment for bill 2
  await prisma.supplierBillPayment.create({
    data: {
      billId: bill2.id,
      supplierId: suppliers[1].id,
      amountPaid: 10000,
      paymentMethod: "CASH",
      notes: "Initial deposit on delivery",
    },
  });

  // --- BILL 3: Premium Silks Ltd, single product, UNPAID ---
  // Silk Premium (20m @ 1500) = 30,000
  const bill3 = await prisma.supplierBill.create({
    data: {
      billNumber: "SB-00003",
      supplierId: suppliers[2].id,
      totalCost: 30000,
      amountPaid: 0,
      paymentStatus: "UNPAID",
      notes: "Silk delivery - 30 day credit terms",
    },
  });

  const stock3 = await prisma.stock.create({
    data: {
      grnNumber: "GRN-00003",
      productId: products[2].id,
      supplierId: suppliers[2].id,
      supplierBillId: bill3.id,
      quantityAdded: 20,
      quantityRemaining: 8.5,   // some sold
      measuringUnit: "METERS",
      buyingPricePerUnit: 1500,
      sellingPricePerUnit: 2000,
      paymentStatus: "UNPAID",
      amountPaid: 0,
      totalCost: 30000,
    },
  });

  // Update GRN and bill counters
  await prisma.counter.update({
    where: { id: "grn" },
    data: { currentValue: 5 },
  });
  await prisma.counter.update({
    where: { id: "supplier_bill" },
    data: { currentValue: 3 },
  });

  console.log("✅ Supplier bills created (3 bills, 5 GRNs)");
  console.log("   SB-00001: ABC Textiles - Blue Chiffon + Polyester Mix = Rs.31,250 (PAID)");
  console.log("   SB-00002: XYZ Fabrics  - Cotton Blend + Button Set = Rs.23,000 (PARTIAL)");
  console.log("   SB-00003: Premium Silks - Silk Premium = Rs.30,000 (UNPAID)");

  // ==========================================
  // 8. CREATE SUPPLIER RETURNS & CREDIT NOTES
  // ==========================================

  // Return 1: 5 meters of Blue Chiffon (GRN-00001, PAID stock)
  // Refund = 5 × 400 = Rs. 2,000 → credit note
  const return1 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00001",
      stockId: stock1.id,
      supplierId: suppliers[0].id,
      productId: products[0].id,
      quantityReturned: 5,
      reason: "DAMAGED",
      refundAmount: 2000,
      refundMethod: "CREDIT_NOTE",
      notes: "Fabric had defects on one side",
    },
  });

  await prisma.supplierCreditNote.create({
    data: {
      creditNoteNumber: "CN-00001",
      supplierId: suppliers[0].id,
      supplierReturnId: return1.id,
      originalAmount: 2000,
      remainingAmount: 2000,
    },
  });

  // Update stock and bill after return
  await prisma.stock.update({
    where: { id: stock1.id },
    data: { quantityRemaining: 40.5 },
  });

  // Return 2: 10 meters of Cotton Blend (GRN-00002, PARTIAL bill)
  // Refund = 10 × 200 = Rs. 2,000 → debt offset reduces bill balance
  const return2 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00002",
      stockId: stock2.id,
      supplierId: suppliers[1].id,
      productId: products[1].id,
      quantityReturned: 10,
      reason: "EXCESS",
      refundAmount: 2000,
      refundMethod: "DEBT_OFFSET",
      notes: "Ordered too much, returning excess",
    },
  });

  // Debt offset: increases bill's amountPaid effectively
  await prisma.supplierBillPayment.create({
    data: {
      billId: bill2.id,
      supplierId: suppliers[1].id,
      amountPaid: 2000,
      paymentMethod: "DEBT_OFFSET",
      notes: "Debt offset from return GRN-RET-00002 (10 METERS Cotton Blend)",
    },
  });

  await prisma.supplierBill.update({
    where: { id: bill2.id },
    data: {
      amountPaid: 12000,  // 10000 + 2000 offset
      totalCost: 21000,   // 23000 - 2000 returned goods value
      paymentStatus: "PARTIAL",
    },
  });

  await prisma.stock.update({
    where: { id: stock2.id },
    data: {
      quantityRemaining: 75,  // was 85, returned 10
      amountPaid: 10696,
      totalCost: 18000,       // 20000 - 2000
    },
  });

  // Return 3: 2 packets of Button Set (GRN-00005, via bill2, credit note)
  // Refund = 2 × 100 = Rs. 200
  const return3 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00003",
      stockId: stock5.id,
      supplierId: suppliers[1].id,
      productId: products[4].id,
      quantityReturned: 2,
      reason: "WRONG_ITEM",
      refundAmount: 200,
      refundMethod: "CREDIT_NOTE",
      notes: "Wrong button color sent",
    },
  });

  await prisma.supplierCreditNote.create({
    data: {
      creditNoteNumber: "CN-00002",
      supplierId: suppliers[1].id,
      supplierReturnId: return3.id,
      originalAmount: 200,
      remainingAmount: 200,
    },
  });

  await prisma.stock.update({
    where: { id: stock5.id },
    data: { quantityRemaining: 26 },
  });

  // Update counters
  await prisma.counter.update({
    where: { id: "grn_return" },
    data: { currentValue: 3 },
  });
  await prisma.counter.update({
    where: { id: "credit_note" },
    data: { currentValue: 2 },
  });

  console.log("✅ Supplier returns created (3 returns)");
  console.log("   GRN-RET-00001: 5m Blue Chiffon  → Credit Note CN-00001 (Rs. 2,000)");
  console.log("   GRN-RET-00002: 10m Cotton Blend → Debt Offset via SB-00002 (Rs. 2,000)");
  console.log("   GRN-RET-00003: 2pkt Button Set  → Credit Note CN-00002 (Rs. 200)");

  // ==========================================
  // 9. CREATE CUSTOMERS
  // ==========================================
  await Promise.all([
    prisma.customer.create({
      data: {
        phoneNumber: "0774444444",
        name: "Kamal Perera",
        email: "kamal@example.com",
        totalPoints: 350,
        membershipTier: "GOLD",
      },
    }),
    prisma.customer.create({
      data: {
        phoneNumber: "0775555555",
        name: "Nimal Silva",
        totalPoints: 89,
        membershipTier: "SILVER",
      },
    }),
    prisma.customer.create({
      data: {
        phoneNumber: "0776666666",
        name: "Saman Kumar",
        totalPoints: 250,
        membershipTier: "PLATINUM",
      },
    }),
  ]);
  console.log("✅ Customers created");

  // ==========================================
  // DONE
  // ==========================================
  console.log("");
  console.log("🎉 Seed completed successfully!");
  console.log("");
  console.log("📋 Login credentials:");
  console.log("   Email:    admin@bigmart.lk");
  console.log("   Password: admin123");
  console.log("");
  console.log("📊 Seed data summary:");
  console.log("   • 4 Categories");
  console.log("   • 3 Suppliers");
  console.log("   • 5 Products");
  console.log("   • 3 Supplier Bills (SB-00001 to SB-00003)");
  console.log("   • 5 Stock entries (GRN-00001 to GRN-00005, linked to bills)");
  console.log("   • 3 Supplier returns (GRN-RET-00001 to GRN-RET-00003)");
  console.log("   • 2 Credit notes (CN-00001: Rs.2,000 | CN-00002: Rs.200)");
  console.log("   • 3 Customers");
  console.log("");
  console.log("💳 Credit notes available:");
  console.log("   • ABC Textiles: CN-00001 → Rs. 2,000 (unused)");
  console.log("   • XYZ Fabrics:  CN-00002 → Rs. 200 (unused)");
  console.log("");
  console.log("📦 Supplier Bills overview:");
  console.log("   • SB-00001 (ABC Textiles):    Rs.31,250 PAID   — 2 products");
  console.log("   • SB-00002 (XYZ Fabrics):     Rs.21,000 PARTIAL — 2 products (after return)");
  console.log("   • SB-00003 (Premium Silks):   Rs.30,000 UNPAID  — 1 product");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
