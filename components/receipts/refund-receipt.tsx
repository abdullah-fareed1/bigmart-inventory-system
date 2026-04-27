// src/components/receipts/refund-receipt.tsx
"use client";

import { formatDateTime } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────

interface RefundReceiptItem {
  productName: string;
  quantityReturned: number;
  measuringUnit?: string;
  pricePerUnit: number;
  refundAmount: number;
  isRestocked: boolean;
  reason: string;
}

interface RefundReceiptProps {
  refundReceiptNumber: string;
  originalReceiptNumber: string;
  refundDate: string | Date;
  customerName?: string;
  customerPhone?: string;
  refundMethod: string;
  items: RefundReceiptItem[];
  totalRefundAmount: number;
  pointsDeducted: number;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

// ─── Reason label helper ───────────────────────────────────────────────────

function reasonLabel(reason: string): string {
  switch (reason) {
    case "DAMAGED":
      return "Damaged";
    case "CHANGE_OF_MIND":
      return "Change of Mind";
    case "WRONG_ITEM":
      return "Wrong Item";
    default:
      return "Other";
  }
}

// ─── React component (for preview) ─────────────────────────────────────────

export function RefundReceipt({
  refundReceiptNumber,
  originalReceiptNumber,
  refundDate,
  customerName,
  customerPhone,
  refundMethod,
  items,
  totalRefundAmount,
  pointsDeducted,
  shopName = "Smart Inventory",
  shopAddress = "Enter your address",
  shopPhone = "0000000000",
}: RefundReceiptProps) {
  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        width: 300,
        margin: "0 auto",
        padding: 12,
      }}
    >
      {/* Shop header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: "bold", fontSize: 14 }}>{shopName}</div>
        <div>{shopAddress}</div>
        <div>{shopPhone}</div>
        <div
          style={{
            marginTop: 6,
            borderTop: "1px dashed #000",
            paddingTop: 6,
            fontWeight: "bold",
            fontSize: 13,
          }}
        >
          REFUND RECEIPT
        </div>
      </div>

      {/* Receipt meta */}
      <div style={{ marginBottom: 6 }}>
        <div>
          <b>Refund #:</b> {refundReceiptNumber}
        </div>
        <div>
          <b>Original:</b> {originalReceiptNumber}
        </div>
        <div>
          <b>Date:</b> {formatDateTime(refundDate)}
        </div>
        {customerName && (
          <div>
            <b>Customer:</b> {customerName}{" "}
            {customerPhone ? `(${customerPhone})` : ""}
          </div>
        )}
        <div>
          <b>Method:</b> {refundMethod}
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", marginBottom: 6 }} />

      {/* Items */}
      <div style={{ marginBottom: 6 }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: "1px dotted #ccc",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{item.productName}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {item.quantityReturned} {item.measuringUnit ?? "m"} ×{" "}
                {item.pricePerUnit.toFixed(2)}
              </span>
              <span>Rs. {item.refundAmount.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>
              Reason: {reasonLabel(item.reason)} |{" "}
              {item.isRestocked ? "Restocked" : "Not restocked"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px dashed #000", marginBottom: 6 }} />

      {/* Totals */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13 }}>
          <span>TOTAL REFUND</span>
          <span>Rs. {totalRefundAmount.toFixed(2)}</span>
        </div>
        {pointsDeducted > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#c00",
              marginTop: 2,
            }}
          >
            <span>Points Deducted</span>
            <span>-{pointsDeducted} pts</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ textAlign: "center", fontSize: 11 }}>
        <div>Please retain this receipt.</div>
        <div>Thank you for shopping with us!</div>
      </div>
    </div>
  );
}

// ─── printRefundReceipt() ───────────────────────────────────────────────────

export function printRefundReceipt(props: RefundReceiptProps) {
  const {
    refundReceiptNumber,
    originalReceiptNumber,
    refundDate,
    customerName,
    customerPhone,
    refundMethod,
    items,
    totalRefundAmount,
    pointsDeducted,
    shopName = "Smart Inventory",
    shopAddress = "Enter your address",
    shopPhone = "0000000000",
  } = props;

  function fmtDate(d: string | Date): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const itemsHtml = items
    .map(
      (item) => `
      <div class="item">
        <div class="item-name">${item.productName}</div>
        <div class="item-row">
          <span>${item.quantityReturned} ${item.measuringUnit ?? "m"} × ${item.pricePerUnit.toFixed(2)}</span>
          <span>Rs. ${item.refundAmount.toFixed(2)}</span>
        </div>
        <div class="item-meta">Reason: ${reasonLabel(item.reason)} | ${item.isRestocked ? "Restocked" : "Not restocked"}</div>
      </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Refund ${refundReceiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 8px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .dotted { border-top: 1px dotted #ccc; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    .shop-name { font-size: 14px; font-weight: bold; }
    .receipt-title { font-size: 13px; font-weight: bold; margin-top: 6px; }
    .meta { margin-bottom: 6px; line-height: 1.6; }
    .item { margin-bottom: 6px; }
    .item-name { font-weight: bold; }
    .item-row { display: flex; justify-content: space-between; }
    .item-meta { font-size: 10px; color: #555; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
    .points-row { display: flex; justify-content: space-between; font-size: 11px; color: #c00; margin-top: 2px; }
    .footer { text-align: center; font-size: 11px; }
    @media print {
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="shop-name">${shopName}</div>
    <div>${shopAddress}</div>
    <div>${shopPhone}</div>
    <div class="receipt-title">REFUND RECEIPT</div>
  </div>

  <div class="dashed"></div>

  <div class="meta">
    <div><span class="bold">Refund #:</span> ${refundReceiptNumber}</div>
    <div><span class="bold">Original:</span> ${originalReceiptNumber}</div>
    <div><span class="bold">Date:</span> ${fmtDate(refundDate)}</div>
    ${customerName ? `<div><span class="bold">Customer:</span> ${customerName} ${customerPhone ? `(${customerPhone})` : ""}</div>` : ""}
    <div><span class="bold">Method:</span> ${refundMethod}</div>
  </div>

  <div class="dashed"></div>

  ${itemsHtml}

  <div class="dashed"></div>

  <div class="total-row">
    <span>TOTAL REFUND</span>
    <span>Rs. ${totalRefundAmount.toFixed(2)}</span>
  </div>
  ${pointsDeducted > 0 ? `<div class="points-row"><span>Points Deducted</span><span>-${pointsDeducted} pts</span></div>` : ""}

  <div class="dashed"></div>

  <div class="footer">
    <div>Please retain this receipt.</div>
    <div>Thank you for shopping with us!</div>
  </div>

  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=400,height=600");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}