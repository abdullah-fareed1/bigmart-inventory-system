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

  try {
    // Batch 1: Customer stats (low overhead)
    const [totalCustomers, newCustomersThisMonth] = await Promise.all([
      prisma.customer.count({
        where: { isActive: true, deletedAt: null },
      }),
      prisma.customer.count({
        where: {
          joinedDate: { gte: monthStart },
          deletedAt: null,
        },
      }),
    ]);

    // Batch 2: Stock stats (aggregated - group by product/supplier/prices)
    const allActiveStocks = await prisma.stock.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        productId: true,
        supplierId: true,
        buyingPricePerUnit: true,
        sellingPricePerUnit: true,
        quantityRemaining: true,
      },
    });

    // Group stocks and count low stock groups
    type GroupKey = string;
    const groupMap = new Map<GroupKey, { total: Prisma.Decimal }>();

    for (const stock of allActiveStocks) {
      const key = `${stock.productId}|${stock.supplierId}|${Number(stock.buyingPricePerUnit).toFixed(2)}|${Number(stock.sellingPricePerUnit).toFixed(2)}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { total: stock.quantityRemaining });
      } else {
        const group = groupMap.get(key)!;
        group.total = new Prisma.Decimal(
          Number(group.total) + Number(stock.quantityRemaining)
        );
      }
    }

    const lowStockCount = Array.from(groupMap.values()).filter(
      (g) => Number(g.total) < 10
    ).length;

    // Batch 3: Transaction stats (may be slower, execute separately)
    const [todaySales, yesterdaySales, weekSales, prevWeekSales, todayTransactionCount, allTransactions, refundsCount, outOfStockCount, allStocks] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          saleDateTime: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          saleDateTime: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          saleDateTime: { gte: weekStart, lt: todayEnd },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          saleDateTime: { gte: prevWeekStart, lt: weekStart },
        },
      }),
      prisma.transaction.count({
        where: {
          saleDateTime: { gte: todayStart, lt: todayEnd },
        },
      }),
      // Get all transactions for today to calculate COGS
      prisma.transaction.findMany({
        where: {
          saleDateTime: { gte: todayStart, lt: todayEnd },
        },
        include: {
          items: {
            include: {
              stock: true,
            },
          },
        },
      }),
      // Count refunds today
      prisma.refund.count({
        where: {
          refundDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      // Count out of stock items
      prisma.stock.count({
        where: {
          quantityRemaining: { lte: 0 },
          isActive: true,
          deletedAt: null,
        },
      }),
      // Calculate total inventory value
      prisma.stock.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        select: {
          buyingPricePerUnit: true,
          quantityRemaining: true,
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

  // Calculate Net Profit (Revenue - COGS)
  let totalCOGS = 0;
  for (const transaction of allTransactions) {
    for (const item of transaction.items) {
      const cost = Number(item.stock?.buyingPricePerUnit ?? 0);
      totalCOGS += cost * Number(item.quantity ?? 0);
    }
  }
  const netProfit = todayTotal - totalCOGS;

  // Calculate average transaction value
  const avgTransactionValue = todayTransactionCount > 0 ? todayTotal / todayTransactionCount : 0;

  // Calculate refund rate
  const refundRate = todayTransactionCount > 0 ? (refundsCount / todayTransactionCount) * 100 : 0;

  // Total inventory value (cost of all stock on hand)
  let totalInventory = 0;
  for (const stock of allStocks) {
    totalInventory += Number(stock.buyingPricePerUnit) * Number(stock.quantityRemaining);
  }

  return {
    todaySales: todayTotal,
    dailyTrend,
    weekSales: weekTotal,
    weeklyTrend,
    totalCustomers,
    newCustomersThisMonth,
    lowStockCount,
    todayTransactionCount,
    netProfit,
    outOfStockCount,
    avgTransactionValue,
    refundRate,
    totalInventoryValue: totalInventory,
  };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    // Return default values if queries timeout
    return {
      todaySales: 0,
      dailyTrend: 0,
      weekSales: 0,
      weeklyTrend: 0,
      totalCustomers: 0,
      newCustomersThisMonth: 0,
      lowStockCount: 0,
      todayTransactionCount: 0,
      netProfit: 0,
      outOfStockCount: 0,
      avgTransactionValue: 0,
      refundRate: 0,
      totalInventoryValue: 0,
    };
  }
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
  try {
    const stocks = await prisma.stock.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        product: true,
        supplier: true,
      },
      orderBy: [
        { product: { name: "asc" } },
        { suppliedDate: "asc" },
      ],
    });

    // Group stocks by (productId, supplierId, buyingPrice, sellingPrice)
    type GroupKey = string;
    type GroupedItem = {
      productId: string;
      productName: string;
      supplierName: string;
      minStockAlert: number;
      unit: string;
      totalRemaining: number;
      firstStockId: string;
    };

    const groupMap = new Map<GroupKey, GroupedItem>();

    for (const stock of stocks) {
      const key = `${stock.productId}|${stock.supplierId}|${Number(stock.buyingPricePerUnit).toFixed(2)}|${Number(stock.sellingPricePerUnit).toFixed(2)}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productId: stock.productId,
          productName: stock.product.name,
          supplierName: stock.supplier.name,
          minStockAlert: stock.product.minStockAlert ?? 5,
          unit: stock.measuringUnit,
          totalRemaining: Number(stock.quantityRemaining),
          firstStockId: stock.id,
        });
      } else {
        const group = groupMap.get(key)!;
        group.totalRemaining += Number(stock.quantityRemaining);
      }
    }

    // Filter groups where aggregate totalRemaining is below the product's minStockAlert
    const lowStocks = Array.from(groupMap.values()).filter(
      (group) => group.totalRemaining < group.minStockAlert
    );

    // Sort by totalRemaining ascending
    lowStocks.sort((a, b) => a.totalRemaining - b.totalRemaining);

    return lowStocks.slice(0, 10).map((group) => ({
      id: group.firstStockId,
      productName: group.productName,
      supplierName: group.supplierName,
      remaining: group.totalRemaining,
      unit: group.unit,
      minStockAlert: group.minStockAlert,
    }));
  } catch (error) {
    console.error("Failed to fetch low stock items:", error);
    return [];
  }
}