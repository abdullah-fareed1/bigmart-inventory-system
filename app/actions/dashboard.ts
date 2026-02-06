"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getDashboardStats() {
  const now = new Date();

  // Today range
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Yesterday range
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // Week range (last 7 days)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Previous week range
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  // This month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todaySales,
    yesterdaySales,
    weekSales,
    prevWeekSales,
    totalCustomers,
    newCustomersThisMonth,
    lowStockCount,
    todayTransactionCount,
  ] = await Promise.all([
    // Today's sales total
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        saleDateTime: { gte: todayStart, lt: todayEnd },
      },
    }),

    // Yesterday's sales total
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        saleDateTime: { gte: yesterdayStart, lt: todayStart },
      },
    }),

    // This week's sales total
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        saleDateTime: { gte: weekStart, lt: todayEnd },
      },
    }),

    // Previous week's sales total
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        saleDateTime: { gte: prevWeekStart, lt: weekStart },
      },
    }),

    // Total active customers
    prisma.customer.count({
      where: { isActive: true, deletedAt: null },
    }),

    // New customers this month
    prisma.customer.count({
      where: {
        joinedDate: { gte: monthStart },
        deletedAt: null,
      },
    }),

    // Low stock count (below 10 units)
    prisma.stock.count({
      where: {
        isActive: true,
        deletedAt: null,
        quantityRemaining: { lt: 10 },
      },
    }),

    // Today's transaction count
    prisma.transaction.count({
      where: {
        saleDateTime: { gte: todayStart, lt: todayEnd },
      },
    }),
  ]);

  const todayTotal = Number(todaySales._sum.totalAmount ?? 0);
  const yesterdayTotal = Number(yesterdaySales._sum.totalAmount ?? 0);
  const weekTotal = Number(weekSales._sum.totalAmount ?? 0);
  const prevWeekTotal = Number(prevWeekSales._sum.totalAmount ?? 0);

  // Calculate trends
  const dailyTrend =
    yesterdayTotal > 0
      ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
      : todayTotal > 0
        ? 100
        : 0;

  const weeklyTrend =
    prevWeekTotal > 0
      ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : weekTotal > 0
        ? 100
        : 0;

  return {
    todaySales: todayTotal,
    dailyTrend,
    weekSales: weekTotal,
    weeklyTrend,
    totalCustomers,
    newCustomersThisMonth,
    lowStockCount,
    todayTransactionCount,
  };
}

export async function getSalesChartData() {
  const now = new Date();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  // 7 days data
  const sevenDaysAgo = new Date(todayEnd);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 30 days data
  const thirtyDaysAgo = new Date(todayEnd);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 12 months data
  const twelveMonthsAgo = new Date(todayEnd);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [sevenDaysTxns, thirtyDaysTxns, twelveMonthsTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: { saleDateTime: { gte: sevenDaysAgo, lt: todayEnd } },
      select: { saleDateTime: true, totalAmount: true },
      orderBy: { saleDateTime: "asc" },
    }),
    prisma.transaction.findMany({
      where: { saleDateTime: { gte: thirtyDaysAgo, lt: todayEnd } },
      select: { saleDateTime: true, totalAmount: true },
      orderBy: { saleDateTime: "asc" },
    }),
    prisma.transaction.findMany({
      where: { saleDateTime: { gte: twelveMonthsAgo, lt: todayEnd } },
      select: { saleDateTime: true, totalAmount: true },
      orderBy: { saleDateTime: "asc" },
    }),
  ]);

  // Group by day for 7 days
  const sevenDaysData = groupByDay(sevenDaysTxns, sevenDaysAgo, 7);

  // Group by day for 30 days
  const thirtyDaysData = groupByDay(thirtyDaysTxns, thirtyDaysAgo, 30);

  // Group by month for 12 months
  const twelveMonthsData = groupByMonth(twelveMonthsTxns, twelveMonthsAgo, 12);

  return {
    "7days": sevenDaysData,
    "30days": thirtyDaysData,
    "12months": twelveMonthsData,
  };
}

function groupByDay(
  txns: { saleDateTime: Date; totalAmount: Prisma.Decimal }[],
  startDate: Date,
  days: number
) {
  const map = new Map<string, number>();

  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    map.set(key, 0);
  }

  // Sum transactions per day
  for (const txn of txns) {
    const key = txn.saleDateTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    map.set(key, (map.get(key) ?? 0) + Number(txn.totalAmount));
  }

  return Array.from(map.entries()).map(([date, amount]) => ({
    date,
    amount: Math.round(amount * 100) / 100,
  }));
}

function groupByMonth(
  txns: { saleDateTime: Date; totalAmount: Prisma.Decimal }[],
  startDate: Date,
  months: number
) {
  const map = new Map<string, number>();

  // Initialize all months with 0
  for (let i = 0; i < months; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    map.set(key, 0);
  }

  // Sum transactions per month
  for (const txn of txns) {
    const key = txn.saleDateTime.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    map.set(key, (map.get(key) ?? 0) + Number(txn.totalAmount));
  }

  return Array.from(map.entries()).map(([date, amount]) => ({
    date,
    amount: Math.round(amount * 100) / 100,
  }));
}

export async function getTopProducts(limit: number = 5) {
  const items = await prisma.transactionItem.groupBy({
    by: ["productName", "measuringUnit"],
    _sum: {
      quantity: true,
      lineTotal: true,
    },
    orderBy: {
      _sum: { lineTotal: "desc" },
    },
    take: limit,
  });

  return items.map((item) => ({
    name: item.productName,
    quantity: Number(item._sum.quantity ?? 0),
    unit: item.measuringUnit,
    revenue: Number(item._sum.lineTotal ?? 0),
  }));
}

export async function getLowStockItems(threshold: number = 10) {
  const stocks = await prisma.stock.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      quantityRemaining: { lt: threshold },
    },
    include: {
      product: { select: { name: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { quantityRemaining: "asc" },
    take: 10,
  });

  return stocks.map((stock) => ({
    id: stock.id,
    productName: stock.product.name,
    supplierName: stock.supplier.name,
    remaining: Number(stock.quantityRemaining),
    unit: stock.measuringUnit,
  }));
}