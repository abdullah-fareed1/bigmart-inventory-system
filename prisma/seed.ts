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
      address: "123 Main Street, Colombo 07",
      phone: "0112345678",
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
  ]);
  console.log("✅ Counters initialized (including credit_note)");

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
  // Delete in order respecting foreign keys
  await prisma.creditNoteUsage.deleteMany({});
  await prisma.supplierCreditNote.deleteMany({});
  await prisma.supplierReturn.deleteMany({});
  await prisma.stockSupplierPayment.deleteMany({});
  await prisma.refundItem.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.transactionItem.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.customerPoint.deleteMany({});
  await prisma.stock.deleteMany({});
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
  // 7. CREATE STOCKS (with GRNs)
  // ==========================================
  const stocks = await Promise.all([
    // GRN-00001: Blue Chiffon, PAID, some sold
    prisma.stock.create({
      data: {
        grnNumber: "GRN-00001",
        productId: products[0].id,
        supplierId: suppliers[0].id,
        quantityAdded: 50,
        quantityRemaining: 45.5,
        measuringUnit: "METERS",
        buyingPricePerUnit: 400,
        sellingPricePerUnit: 500,
        paymentStatus: "PAID",
        amountPaid: 20000,
        totalCost: 20000,
      },
    }),
    // GRN-00002: Cotton Blend, PARTIAL payment, some sold
    prisma.stock.create({
      data: {
        grnNumber: "GRN-00002",
        productId: products[1].id,
        supplierId: suppliers[1].id,
        quantityAdded: 100,
        quantityRemaining: 85,
        measuringUnit: "METERS",
        buyingPricePerUnit: 200,
        sellingPricePerUnit: 300,
        paymentStatus: "PARTIAL",
        amountPaid: 10000,
        totalCost: 20000,
      },
    }),
    // GRN-00003: Silk Premium, UNPAID, some sold
    prisma.stock.create({
      data: {
        grnNumber: "GRN-00003",
        productId: products[2].id,
        supplierId: suppliers[2].id,
        quantityAdded: 20,
        quantityRemaining: 8.5,
        measuringUnit: "METERS",
        buyingPricePerUnit: 1500,
        sellingPricePerUnit: 2000,
        paymentStatus: "UNPAID",
        amountPaid: 0,
        totalCost: 30000,
      },
    }),
    // GRN-00004: Polyester Mix, PAID, untouched
    prisma.stock.create({
      data: {
        grnNumber: "GRN-00004",
        productId: products[3].id,
        supplierId: suppliers[0].id,
        quantityAdded: 75,
        quantityRemaining: 75,
        measuringUnit: "METERS",
        buyingPricePerUnit: 150,
        sellingPricePerUnit: 250,
        paymentStatus: "PAID",
        amountPaid: 11250,
        totalCost: 11250,
      },
    }),
    // GRN-00005: Button Set, PAID, some sold
    prisma.stock.create({
      data: {
        grnNumber: "GRN-00005",
        productId: products[4].id,
        supplierId: suppliers[1].id,
        quantityAdded: 30,
        quantityRemaining: 28,
        measuringUnit: "PACKETS",
        buyingPricePerUnit: 100,
        sellingPricePerUnit: 180,
        paymentStatus: "PAID",
        amountPaid: 3000,
        totalCost: 3000,
      },
    }),
  ]);

  // Update GRN counter to match
  await prisma.counter.update({
    where: { id: "grn" },
    data: { currentValue: 5 },
  });
  console.log("✅ Stocks created (5 GRNs)");

  // ==========================================
  // 8. CREATE SUPPLIER RETURNS & CREDIT NOTES
  // ==========================================

  // Return 1: 5 meters of Blue Chiffon (GRN-00001, PAID stock)
  // → Full credit note since stock was already paid
  // Refund = 5 × 400 = Rs. 2,000
  const return1 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00001",
      stockId: stocks[0].id,
      supplierId: suppliers[0].id,
      productId: products[0].id,
      quantityReturned: 5,
      reason: "DAMAGED",
      refundAmount: 2000,
      refundMethod: "CREDIT_NOTE",
      notes: "Fabric had defects on one side",
    },
  });

  // Credit note for the above return (Rs. 2,000 for ABC Textiles)
  const creditNote1 = await prisma.supplierCreditNote.create({
    data: {
      creditNoteNumber: "CN-00001",
      supplierId: suppliers[0].id,
      supplierReturnId: return1.id,
      originalAmount: 2000,
      remainingAmount: 2000, // Not yet used
    },
  });

  // Update stock quantity (50 - 5 already sold - 5 returned = remaining stays 45.5 → 40.5)
  await prisma.stock.update({
    where: { id: stocks[0].id },
    data: { quantityRemaining: 40.5 },
  });

  // Return 2: 10 meters of Cotton Blend (GRN-00002, PARTIAL stock)
  // → Debt offset since stock has Rs. 10,000 outstanding
  // Refund = 10 × 200 = Rs. 2,000 → reduces debt from 10,000 to 8,000
  const return2 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00002",
      stockId: stocks[1].id,
      supplierId: suppliers[1].id,
      productId: products[1].id,
      quantityReturned: 10,
      reason: "EXCESS",
      refundAmount: 2000,
      refundMethod: "DEBT_OFFSET",
      notes: "Ordered too much, returning excess",
    },
  });

  // Update stock: reduce qty and increase amountPaid (debt offset)
  await prisma.stock.update({
    where: { id: stocks[1].id },
    data: {
      quantityRemaining: 75, // was 85, returned 10
      amountPaid: 12000,     // was 10000, offset 2000
    },
  });

  // Record the debt offset as a payment for traceability
  await prisma.stockSupplierPayment.create({
    data: {
      stockId: stocks[1].id,
      supplierId: suppliers[1].id,
      amountPaid: 2000,
      paymentMethod: "DEBT_OFFSET",
      notes: "Debt offset from return GRN-RET-00002 (10 METERS returned)",
    },
  });

  // Return 3: 2 packets of Button Set (GRN-00005, PAID stock)
  // → Credit note since stock was fully paid
  // Refund = 2 × 100 = Rs. 200
  const return3 = await prisma.supplierReturn.create({
    data: {
      returnNumber: "GRN-RET-00003",
      stockId: stocks[4].id,
      supplierId: suppliers[1].id,
      productId: products[4].id,
      quantityReturned: 2,
      reason: "WRONG_ITEM",
      refundAmount: 200,
      refundMethod: "CREDIT_NOTE",
      notes: "Wrong button color sent",
    },
  });

  const creditNote2 = await prisma.supplierCreditNote.create({
    data: {
      creditNoteNumber: "CN-00002",
      supplierId: suppliers[1].id,
      supplierReturnId: return3.id,
      originalAmount: 200,
      remainingAmount: 200, // Not yet used
    },
  });

  // Update stock quantity
  await prisma.stock.update({
    where: { id: stocks[4].id },
    data: { quantityRemaining: 26 }, // was 28, returned 2
  });

  // Update counters to match
  await prisma.counter.update({
    where: { id: "grn_return" },
    data: { currentValue: 3 },
  });
  await prisma.counter.update({
    where: { id: "credit_note" },
    data: { currentValue: 2 },
  });

  console.log("✅ Supplier returns created (3 returns)");
  console.log("   GRN-RET-00001: 5m Blue Chiffon → Credit Note CN-00001 (Rs. 2,000)");
  console.log("   GRN-RET-00002: 10m Cotton Blend → Debt Offset (Rs. 2,000)");
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
  console.log("   • 5 Stock entries (GRN-00001 to GRN-00005)");
  console.log("   • 3 Supplier returns (GRN-RET-00001 to GRN-RET-00003)");
  console.log("   • 2 Credit notes (CN-00001: Rs.2,000 | CN-00002: Rs.200)");
  console.log("   • 3 Customers");
  console.log("");
  console.log("💳 Credit notes available:");
  console.log("   • ABC Textiles:  CN-00001 → Rs. 2,000 (unused)");
  console.log("   • XYZ Fabrics:   CN-00002 → Rs. 200 (unused)");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });