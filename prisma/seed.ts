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
    update: {},
    create: {
      id: "shop-settings",
      shopName: "Textile Palace",
      address: "123 Main Street, Colombo 07",
      phone: "0112345678",
      email: "info@textilepalace.lk",
    },
  });
  console.log("✅ Shop settings created");

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
  ]);
  console.log("✅ Counters initialized");

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
  await Promise.all([
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
  // 8. CREATE CUSTOMERS
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
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });