// src/components/receipts/sale-receipt.tsx
"use client";

import { formatCurrency, formatDateTime } from "@/lib/format";

interface ReceiptItem {
  productName: string;
  quantity: number;
  measuringUnit: string;
  pricePerUnit: number;
  itemDiscount: number;
  lineTotal: number;
}

interface SaleReceiptData {
  receiptNumber: string;
  saleDateTime: string | Date;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  items: ReceiptItem[];
  subtotal: number;
  totalItemDiscount: number;
  cartDiscount: number;
  pointsRedeemed: number;
  pointsRedeemedValue: number;
  totalAmount: number;
  amountPaid: number;
  changeGiven: number;
  pointsEarned: number;
  returnPolicyDays?: number;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export function SaleReceipt({ data }: { data: SaleReceiptData }) {
  const returnDays = data.returnPolicyDays || 7;
  return (
    <div
      id="sale-receipt"
      style={{
        width: "80mm",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: "1.4",
        padding: "4mm",
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>
          {data.shopName || "Smart Inventory"}
        </div>
        {data.shopAddress && (
          <div style={{ fontSize: "10px" }}>{data.shopAddress}</div>
        )}
        {data.shopPhone && (
          <div style={{ fontSize: "10px" }}>Tel: {data.shopPhone}</div>
        )}
      </div>

      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "4px 0",
        }}
      />

      {/* Receipt Info */}
      <div style={{ marginBottom: "4px" }}>
        <div>
          <strong>Receipt:</strong> {data.receiptNumber}
        </div>
        <div>
          <strong>Date:</strong> {formatDateTime(data.saleDateTime)}
        </div>
        {data.customerName && (
          <div>
            <strong>Customer:</strong> {data.customerName}
            {data.customerPhone ? ` (${data.customerPhone})` : ""}
          </div>
        )}
        <div>
          <strong>Payment:</strong> {data.paymentMethod}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "4px 0",
        }}
      />

      {/* Items */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: "2px" }}>Item</th>
            <th style={{ textAlign: "right", paddingBottom: "2px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ paddingTop: "4px", verticalAlign: "top" }}>
                <div>{item.productName}</div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  {item.quantity} {item.measuringUnit} ×{" "}
                  {formatCurrency(item.pricePerUnit)}
                  {item.itemDiscount > 0 && (
                    <span> (disc: -{formatCurrency(item.itemDiscount)})</span>
                  )}
                </div>
              </td>
              <td
                style={{
                  textAlign: "right",
                  paddingTop: "4px",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "6px 0",
        }}
      />

      {/* Totals */}
      <div style={{ fontSize: "11px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Subtotal:</span>
          <span>{formatCurrency(data.subtotal)}</span>
        </div>

        {data.totalItemDiscount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Item Discounts:</span>
            <span>-{formatCurrency(data.totalItemDiscount)}</span>
          </div>
        )}

        {data.cartDiscount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Cart Discount:</span>
            <span>-{formatCurrency(data.cartDiscount)}</span>
          </div>
        )}

        {data.pointsRedeemedValue > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Points Redeemed ({data.pointsRedeemed} pts):</span>
            <span>-{formatCurrency(data.pointsRedeemedValue)}</span>
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid #000",
            marginTop: "4px",
            paddingTop: "4px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          <span>TOTAL:</span>
          <span>{formatCurrency(data.totalAmount)}</span>
        </div>

        {data.paymentMethod === "CASH" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "2px",
              }}
            >
              <span>Paid:</span>
              <span>{formatCurrency(data.amountPaid)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
              }}
            >
              <span>Change:</span>
              <span>{formatCurrency(data.changeGiven)}</span>
            </div>
          </>
        )}
      </div>

      {/* Points earned */}
      {data.pointsEarned > 0 && data.customerName && (
        <>
          <div
            style={{
              borderTop: "1px dashed #000",
              margin: "6px 0",
            }}
          />
          <div style={{ textAlign: "center", fontSize: "11px" }}>
            Points Earned: <strong>+{data.pointsEarned}</strong>
          </div>
        </>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: "1px dashed #000",
          marginTop: "6px",
          paddingTop: "4px",
          textAlign: "center",
          fontSize: "10px",
        }}
      >
        <div>Thank you for shopping with us!</div>
        <div style={{ marginTop: "2px" }}>
          Exchange within {returnDays} days with receipt
        </div>
      </div>
    </div>
  );
}

// ─── Print Function ──────────────────────────────────────────────

export function printSaleReceipt(data: SaleReceiptData) {
  const printWindow = window.open("", "_blank", "width=320,height=600");
  if (!printWindow) return;

  const fmtCurrency = (amount: number) => {
    const num = Number(amount);
    if (isNaN(num)) return "Rs. 0.00";
    return `Rs. ${num.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const fmtDateTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding-top:4px;vertical-align:top">
        <div>${item.productName}</div>
        <div style="font-size:10px;color:#666">
          ${item.quantity} ${item.measuringUnit} × ${fmtCurrency(item.pricePerUnit)}
          ${item.itemDiscount > 0 ? `(disc: -${fmtCurrency(item.itemDiscount)})` : ""}
        </div>
      </td>
      <td style="text-align:right;padding-top:4px;vertical-align:top;white-space:nowrap">
        ${fmtCurrency(item.lineTotal)}
      </td>
    </tr>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${data.receiptNumber}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 4mm;
      margin: 0;
      color: #000;
      width: 80mm;
    }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
  </style>
</head>
<body>
  <div class="center">
    <div style="font-size:16px;font-weight:bold">${data.shopName || "Smart Inventory"}</div>
    ${data.shopAddress ? `<div style="font-size:10px">${data.shopAddress}</div>` : ""}
    ${data.shopPhone ? `<div style="font-size:10px">Tel: ${data.shopPhone}</div>` : ""}
  </div>
  <div class="divider"></div>
  <div>
    <div><strong>Receipt:</strong> ${data.receiptNumber}</div>
    <div><strong>Date:</strong> ${fmtDateTime(data.saleDateTime)}</div>
    ${data.customerName ? `<div><strong>Customer:</strong> ${data.customerName}${data.customerPhone ? ` (${data.customerPhone})` : ""}</div>` : ""}
    <div><strong>Payment:</strong> ${data.paymentMethod}</div>
  </div>
  <div class="divider"></div>
  <table>
    <thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="divider"></div>
  <div style="font-size:11px">
    <div class="row"><span>Subtotal:</span><span>${fmtCurrency(data.subtotal)}</span></div>
    ${data.totalItemDiscount > 0 ? `<div class="row"><span>Item Discounts:</span><span>-${fmtCurrency(data.totalItemDiscount)}</span></div>` : ""}
    ${data.cartDiscount > 0 ? `<div class="row"><span>Cart Discount:</span><span>-${fmtCurrency(data.cartDiscount)}</span></div>` : ""}
    ${data.pointsRedeemedValue > 0 ? `<div class="row"><span>Points Redeemed (${data.pointsRedeemed} pts):</span><span>-${fmtCurrency(data.pointsRedeemedValue)}</span></div>` : ""}
    <div style="border-top:1px solid #000;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-size:14px;font-weight:bold">
      <span>TOTAL:</span><span>${fmtCurrency(data.totalAmount)}</span>
    </div>
    ${data.paymentMethod === "CASH" ? `
    <div class="row" style="margin-top:2px"><span>Paid:</span><span>${fmtCurrency(data.amountPaid)}</span></div>
    <div class="row bold"><span>Change:</span><span>${fmtCurrency(data.changeGiven)}</span></div>
    ` : ""}
  </div>
  ${data.pointsEarned > 0 && data.customerName ? `
  <div class="divider"></div>
  <div class="center" style="font-size:11px">Points Earned: <strong>+${data.pointsEarned}</strong></div>
  ` : ""}
  <div class="divider" style="margin-top:6px"></div>
  <div class="center" style="font-size:10px">
    <div>Thank you for shopping with us!</div>
    <div style="margin-top:2px">Exchange within ${data.returnPolicyDays || 7} days with receipt</div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}