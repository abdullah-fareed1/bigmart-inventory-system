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
      role: "ADMIN",
    },
  });
  console.log("✅ Admin created (admin@bigmart.lk / admin123)");

  // ==========================================
  // 1.5. CREATE CASHIER USER
  // ==========================================
  const cashierPassword = await bcrypt.hash("cashier123", 10);
  await prisma.admin.upsert({
    where: { email: "cashier@bigmart.lk" },
    update: {},
    create: {
      email: "cashier@bigmart.lk",
      password: cashierPassword,
      name: "Cashier User",
      role: "CASHIER",
    },
  });
  console.log("✅ Cashier created (cashier@bigmart.lk / cashier123)");

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
      where: { name: "Mens Wear" },
      update: {},
      create: { name: "Mens Wear" },
    }),
    prisma.category.upsert({
      where: { name: "Women's Wear" },
      update: {},
      create: { name: "Women's Wear" },
    }),
    prisma.category.upsert({
      where: { name: "Kid's Wear" },
      update: {},
      create: { name: "Kid's Wear" },
    }),
    prisma.category.upsert({
      where: { name: "Accessories" },
      update: {},
      create: { name: "Accessories" },
    }),
    prisma.category.upsert({
      where: { name: "School Items" },
      update: {},
      create: { name: "School Items" },
    }),
    prisma.category.upsert({
      where: { name: "Threads" },
      update: {},
      create: { name: "Threads" },
    }),
    prisma.category.upsert({
      where: { name: "Fabrics" },
      update: {},
      create: { name: "Fabrics" },
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
        name: "Prime Textiles Ltd",
        phoneNumber: "0771111111",
        notes: "Supplier for garments and fabrics",
      },
    }),
    prisma.supplier.upsert({
      where: { phoneNumber: "0772222222" },
      update: {},
      create: {
        name: "Global Fashion Supplies",
        phoneNumber: "0772222222",
        notes: "Threads, accessories, and school items supplier",
      },
    }),
  ]);
  console.log("✅ Suppliers created");

  // ==========================================
  // 7. CLEANUP OLD DATA
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
  console.log("🧹 Cleaned old seed data");

  // ==========================================
  // 8. DONE
  // ==========================================
  console.log("");
  console.log("🎉 Seed completed successfully!");
  console.log("");
  console.log("📋 Login credentials:");
  console.log("   Email:    admin@bigmart.lk");
  console.log("   Password: admin123");
  console.log("");
  console.log("📊 Seed data summary:");
  console.log("   • 7 Categories (Mens Wear, Women's Wear, Kid's Wear, Accessories, School Items, Threads, Fabrics)");
  console.log("   • 2 Suppliers (Prime Textiles Ltd, Global Fashion Supplies)");
  console.log("   • 10 Products (ready for you to add stocks)");
  console.log("");
  console.log("✨ Ready for you to add stocks!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
