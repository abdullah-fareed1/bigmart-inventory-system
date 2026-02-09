// src/components/receipts/grn-receipt.tsx
"use client";

import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

interface GRNReceiptProps {
  stock: {
    grnNumber: string;
    suppliedDate: Date | string;
    product: { name: string };
    supplier: { name: string; phoneNumber: string };
    quantityAdded: number;
    measuringUnit: string;
    buyingPricePerUnit: number;
    sellingPricePerUnit: number;
    totalCost: number;
    amountPaid: number;
    paymentStatus: string;
    notes?: string | null;
    payments?: Array<{
      paymentMethod: string;
      amountPaid: number;
      notes?: string | null;
    }>;
  };
  shopSettings: {
    shopName: string;
    address: string;
    phone: string;
  };
}

export function GRNReceipt({ stock, shopSettings }: GRNReceiptProps) {
  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const balance = totalCost - amountPaid;

  // Group payments by method
  const paymentBreakdown = getPaymentBreakdown(stock.payments || []);

  return (
    <div
      className="grn-receipt"
      style={{ fontFamily: "monospace", width: "302px", padding: "8px" }}
    >
      <style>
        {`
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body { margin: 0; }
            .grn-receipt { width: 100% !important; }
            .no-print { display: none !important; }
          }
          .grn-receipt { font-size: 12px; line-height: 1.4; color: #000; }
          .grn-receipt .center { text-align: center; }
          .grn-receipt .bold { font-weight: bold; }
          .grn-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .grn-receipt .double-divider { border-top: 2px solid #000; margin: 4px 0; }
          .grn-receipt .row { display: flex; justify-content: space-between; }
          .grn-receipt .title { font-size: 14px; font-weight: bold; }
        `}
      </style>

      <div className="center">
        <div className="title">{shopSettings.shopName}</div>
        <div>{shopSettings.address}</div>
        <div>Tel: {shopSettings.phone}</div>
      </div>

      <div className="double-divider" />
      <div className="center bold title">GOODS RECEIVE NOTE</div>
      <div className="divider" />

      <div className="row">
        <span>GRN #:</span>
        <span className="bold">{stock.grnNumber}</span>
      </div>
      <div className="row">
        <span>Date:</span>
        <span>{formatDateTime(stock.suppliedDate)}</span>
      </div>

      <div className="divider" />
      <div className="bold">Supplier:</div>
      <div>{stock.supplier.name}</div>
      <div>Tel: {stock.supplier.phoneNumber}</div>

      <div className="divider" />
      <div className="bold">Product:</div>
      <div>{stock.product.name}</div>

      <div className="divider" />
      <div className="row">
        <span>Quantity:</span>
        <span>
          {formatQuantity(stock.quantityAdded)} {stock.measuringUnit}
        </span>
      </div>
      <div className="row">
        <span>Unit Price:</span>
        <span>{formatCurrency(stock.buyingPricePerUnit)}</span>
      </div>

      <div className="double-divider" />

      <div className="row bold">
        <span>Total Cost:</span>
        <span>{formatCurrency(totalCost)}</span>
      </div>

      {/* Payment Breakdown */}
      {paymentBreakdown.length > 0 && (
        <>
          <div className="divider" />
          <div className="bold" style={{ fontSize: "10px" }}>
            PAYMENT DETAILS:
          </div>
          {paymentBreakdown.map((item, i) => (
            <div className="row" key={i}>
              <span>{item.label}:</span>
              <span>{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="divider" />
        </>
      )}

      <div className="row">
        <span>Total Paid:</span>
        <span className="bold">{formatCurrency(amountPaid)}</span>
      </div>

      {balance > 0 && (
        <div className="row bold">
          <span>Balance Due:</span>
          <span>{formatCurrency(balance)}</span>
        </div>
      )}
      <div className="row">
        <span>Payment Status:</span>
        <span className="bold">{stock.paymentStatus}</span>
      </div>

      <div className="double-divider" />

      {stock.notes && (
        <>
          <div className="bold">Notes:</div>
          <div>{stock.notes}</div>
          <div className="divider" />
        </>
      )}

      <div className="center" style={{ marginTop: "8px" }}>
        <div>Received By: _______________</div>
        <div style={{ marginTop: "16px" }}>Signature: _______________</div>
      </div>

      <div className="divider" style={{ marginTop: "12px" }} />
      <div className="center" style={{ fontSize: "10px" }}>
        Generated on {formatDateTime(new Date())}
      </div>
    </div>
  );
}

// ─── Payment Breakdown Helper ────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHECK: "Cheque",
  CREDIT_NOTE: "Credit Note",
  DEBT_OFFSET: "Debt Offset",
};

function getPaymentBreakdown(
  payments: Array<{ paymentMethod: string; amountPaid: number }>
) {
  if (!payments || payments.length === 0) return [];

  // Group by method
  const grouped: Record<string, number> = {};
  for (const p of payments) {
    const method = p.paymentMethod;
    grouped[method] = (grouped[method] || 0) + Number(p.amountPaid);
  }

  return Object.entries(grouped).map(([method, amount]) => ({
    label: METHOD_LABELS[method] || method,
    amount: parseFloat(amount.toFixed(2)),
  }));
}

// ─── Print Function ──────────────────────────────────────────────

export function printGRN(
  stock: GRNReceiptProps["stock"],
  shopSettings: GRNReceiptProps["shopSettings"]
) {
  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const balance = totalCost - amountPaid;
  const paymentBreakdown = getPaymentBreakdown(stock.payments || []);

  const paymentDetailsHtml =
    paymentBreakdown.length > 0
      ? `
    <div class="divider"></div>
    <div class="bold" style="font-size: 10px;">PAYMENT DETAILS:</div>
    ${paymentBreakdown.map((item) => `<div class="row"><span>${item.label}:</span><span>${formatCurrency(item.amount)}</span></div>`).join("")}
    <div class="divider"></div>
  `
      : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>GRN - ${stock.grnNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: monospace; font-size: 12px; line-height: 1.4; color: #000; width: 76mm; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-top: 2px solid #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    .title { font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${shopSettings.shopName}</div>
    <div>${shopSettings.address}</div>
    <div>Tel: ${shopSettings.phone}</div>
  </div>
  <div class="double-divider"></div>
  <div class="center bold title">GOODS RECEIVE NOTE</div>
  <div class="divider"></div>
  <div class="row"><span>GRN #:</span><span class="bold">${stock.grnNumber}</span></div>
  <div class="row"><span>Date:</span><span>${formatDateTime(stock.suppliedDate)}</span></div>
  <div class="divider"></div>
  <div class="bold">Supplier:</div>
  <div>${stock.supplier.name}</div>
  <div>Tel: ${stock.supplier.phoneNumber}</div>
  <div class="divider"></div>
  <div class="bold">Product:</div>
  <div>${stock.product.name}</div>
  <div class="divider"></div>
  <div class="row"><span>Quantity:</span><span>${formatQuantity(stock.quantityAdded)} ${stock.measuringUnit}</span></div>
  <div class="row"><span>Unit Price:</span><span>${formatCurrency(stock.buyingPricePerUnit)}</span></div>
  <div class="double-divider"></div>
  <div class="row bold"><span>Total Cost:</span><span>${formatCurrency(totalCost)}</span></div>
  ${paymentDetailsHtml}
  <div class="row"><span>Total Paid:</span><span class="bold">${formatCurrency(amountPaid)}</span></div>
  ${balance > 0 ? `<div class="row bold"><span>Balance Due:</span><span>${formatCurrency(balance)}</span></div>` : ""}
  <div class="row"><span>Payment Status:</span><span class="bold">${stock.paymentStatus}</span></div>
  <div class="double-divider"></div>
  ${stock.notes ? `<div class="bold">Notes:</div><div>${stock.notes}</div><div class="divider"></div>` : ""}
  <div class="center" style="margin-top: 8px;">
    <div>Received By: _______________</div>
    <div style="margin-top: 16px;">Signature: _______________</div>
  </div>
  <div class="divider" style="margin-top: 12px;"></div>
  <div class="center" style="font-size: 10px;">Generated on ${formatDateTime(new Date())}</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
}