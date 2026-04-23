import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
} from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChartWrapper } from "./sales-chart-wrapper";
import { TopProductsWrapper } from "./top-products-wrapper";
import { LowStockWrapper } from "./low-stock-wrapper";
import {
  getDashboardStats,
  getSalesChartData,
  getTopProducts,
  getLowStockItems,
} from "@/actions/dashboard";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role || "ADMIN";
  const isCashier = userRole === "CASHIER";

  const [stats, chartData, topProducts, lowStockItems] = await Promise.all([
    getDashboardStats(),
    getSalesChartData(),
    getTopProducts(),
    getLowStockItems(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCashier ? "Point of Sale Dashboard" : "Dashboard"}
        description={
          isCashier
            ? "Your daily sales performance"
            : "Overview of your textile shop performance"
        }
      />

      {isCashier ? (
        <>
          {/* Simplified Cashier Dashboard */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <StatCard
              title="Today's Sales"
              value={formatCurrency(stats.todaySales)}
              icon={DollarSign}
            />
            <StatCard
              title="Transactions Today"
              value={stats.todayTransactionCount.toLocaleString()}
              icon={ShoppingCart}
            />
          </div>

          {/* Quick View Chart */}
          <div className="grid gap-4">
            <SalesChartWrapper data={chartData} />
          </div>
        </>
      ) : (
        <>
          {/* Full Admin Dashboard */}
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Sales"
              value={formatCurrency(stats.todaySales)}
              icon={DollarSign}
              trend={
                stats.dailyTrend !== 0
                  ? {
                      value: Math.abs(stats.dailyTrend),
                      isPositive: stats.dailyTrend > 0,
                      label: "from yesterday",
                    }
                  : undefined
              }
            />
            <StatCard
              title="Weekly Sales"
              value={formatCurrency(stats.weekSales)}
              icon={TrendingUp}
              trend={
                stats.weeklyTrend !== 0
                  ? {
                      value: Math.abs(stats.weeklyTrend),
                      isPositive: stats.weeklyTrend > 0,
                      label: "from last week",
                    }
                  : undefined
              }
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers.toLocaleString()}
              icon={Users}
              trend={
                stats.newCustomersThisMonth > 0
                  ? {
                      value: stats.newCustomersThisMonth,
                      isPositive: true,
                      label: "new this month",
                    }
                  : undefined
              }
            />
            <StatCard
              title="Today's Transactions"
              value={stats.todayTransactionCount.toLocaleString()}
              icon={ShoppingCart}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <SalesChartWrapper data={chartData} />
            </div>
            <div className="lg:col-span-3">
              <TopProductsWrapper products={topProducts} />
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="grid gap-4 lg:grid-cols-2">
            <LowStockWrapper items={lowStockItems} />
          </div>
        </>
      )}
    </div>
  );
}