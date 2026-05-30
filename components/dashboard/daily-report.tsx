"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { formatCurrency, formatDate } from "@/lib/format";

interface ProductSoldToday {
  productId: string;
  productName: string;
  unit: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

interface StockAddedToday {
  id: string;
  grnNumber: string;
  productName: string;
  supplierName: string;
  quantityAdded: number;
  unit: string;
  buyingPricePerUnit: number;
  totalCost: number;
  suppliedDate: string;
}

interface DailyReportProps {
  report: {
    totalCashReceived: number;
    totalSalesRevenue: number;
    totalProfit: number;
    totalStocksAddedQuantity: number;
    totalStockCostAdded: number;
    stockEntriesAdded: number;
    productsSoldToday: ProductSoldToday[];
    stocksAddedToday: StockAddedToday[];
  };
}

export function DailyReport({ report }: DailyReportProps) {
  const productColumns = [
    {
      key: "productName",
      label: "Product",
    },
    {
      key: "quantitySold",
      label: "Qty Sold",
      render: (item: ProductSoldToday) =>
        `${item.quantitySold.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${item.unit}`,
    },
    {
      key: "revenue",
      label: "Revenue",
      render: (item: ProductSoldToday) => formatCurrency(item.revenue),
    },
    {
      key: "profit",
      label: "Profit",
      render: (item: ProductSoldToday) => formatCurrency(item.profit),
    },
    {
      key: "profitMargin",
      label: "Margin",
      render: (item: ProductSoldToday) => `${item.profitMargin.toFixed(1)}%`,
    },
  ];

  const stockColumns = [
    {
      key: "productName",
      label: "Product",
    },
    {
      key: "supplierName",
      label: "Supplier",
    },
    {
      key: "grnNumber",
      label: "GRN",
    },
    {
      key: "quantityAdded",
      label: "Qty Added",
      render: (item: StockAddedToday) =>
        `${item.quantityAdded.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${item.unit}`,
    },
    {
      key: "buyingPricePerUnit",
      label: "Buy Price",
      render: (item: StockAddedToday) => formatCurrency(item.buyingPricePerUnit),
    },
    {
      key: "totalCost",
      label: "Total Cost",
      render: (item: StockAddedToday) => formatCurrency(item.totalCost),
    },
    {
      key: "suppliedDate",
      label: "Added On",
      render: (item: StockAddedToday) => formatDate(new Date(item.suppliedDate)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Cash Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(report.totalCashReceived)}
            </div>
            <p className="text-sm text-muted-foreground">
              Collected from today&apos;s sales.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(report.totalProfit)}
            </div>
            <p className="text-sm text-muted-foreground">
              Revenue minus cost of goods sold for today.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stocks Added Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {report.totalStocksAddedQuantity.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Quantity added across all new stock records.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Entries Added</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {report.stockEntriesAdded.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              New stock records created today.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Stock Cost Added</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(report.totalStockCostAdded)}
            </div>
            <p className="text-sm text-muted-foreground">
              Total cost value of stock received today.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Products Sold Today</CardTitle>
            <p className="text-sm text-muted-foreground">
              Products sold today with quantity, revenue, and profit.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={productColumns}
            data={report.productsSoldToday}
            emptyMessage="No products were sold today."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stocks Added Today</CardTitle>
            <p className="text-sm text-muted-foreground">
              Stock batches added today with supplier, GRN, quantity and cost.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={stockColumns}
            data={report.stocksAddedToday}
            emptyMessage="No stocks were added today."
          />
        </CardContent>
      </Card>
    </div>
  );
}
