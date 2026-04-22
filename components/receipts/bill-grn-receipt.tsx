"use client";

import { formatCurrency, formatDateTime } from "@/lib/format";

interface BillGRNReceiptProps {
  bill: {
    billNumber: string;
    supplierInvoiceRef?: string | null;
    createdAt: Date | string;
    supplier: { name: string; phoneNumber: string };
    stocks: Array<{
      grnNumber: string;
      product: { name: string };
      quantityAdded: number;
      measuringUnit: string;
      buyingPricePerUnit: number;
      sellingPricePerUnit: number;
      totalCost: number;
    }>;
    totalCost: number;
    amountPaid: number;
    paymentStatus: string;
    payments: Array<{ paymentMethod: string; amountPaid: number }>;
    notes?: string | null;
  };
  shopSettings: { shopName: string; address: string; phone: string };
}

export function BillGRNReceipt({ bill, shopSettings }: BillGRNReceiptProps) {
  const totalCost = Number(bill.totalCost);
  const amountPaid = Number(bill.amountPaid);
  const balance = Math.max(0, totalCost - amountPaid);

  // Group payments by method
  const paymentBreakdown = getPaymentBreakdown(bill.payments || []);

  return (
    <div
      className="bill-grn-receipt"
      style={{ fontFamily: "monospace", width: "302px", padding: "8px" }}
    >
      <style>
        {`
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body { margin: 0; }
            .bill-grn-receipt { width: 100% !important; }
            .no-print { display: none !important; }
          }
          .bill-grn-receipt { font-size: 12px; line-height: 1.4; color: #000; }
          .bill-grn-receipt .center { text-align: center; }
          .bill-grn-receipt .bold { font-weight: bold; }
          .bill-grn-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .bill-grn-receipt .double-divider { border-top: 2px solid #000; margin: 4px 0; }
          .bill-grn-receipt .row { display: flex; justify-content: space-between; }
          .bill-grn-receipt .title { font-size: 14px; font-weight: bold; }
          .bill-grn-receipt .section-title { font-weight: bold; margin-top: 6px; margin-bottom: 2px; border-bottom: 1px dashed #000; padding-bottom: 2px; }
          .bill-grn-receipt .item { margin: 4px 0; padding-bottom: 4px; border-bottom: 1px dotted #ccc; }
          .bill-grn-receipt .item-header { font-weight: bold; margin-bottom: 2px; }
          .bill-grn-receipt .item-detail { font-size: 10px; margin: 1px 0; padding-left: 4px; }
        `}
      </style>

      <div className="center">
        <div className="title">{shopSettings.shopName}</div>
        <div>{shopSettings.address}</div>
        <div>Tel: {shopSettings.phone}</div>
      </div>

      <div className="double-divider" />
      <div className="center bold title" style={{ textDecoration: "underline" }}>
        SUPPLIER BILL / GRN
      </div>
      <div className="divider" />

      <div className="row">
        <span className="bold">Bill #:</span>
        <span>{bill.billNumber}</span>
      </div>
      <div className="row">
        <span className="bold">Date:</span>
        <span>{formatDateTime(bill.createdAt)}</span>
      </div>
      {bill.supplierInvoiceRef && (
        <div className="row">
          <span className="bold">Inv. Ref:</span>
          <span>{bill.supplierInvoiceRef}</span>
        </div>
      )}

      <div className="divider" />
      <div className="section-title">Supplier:</div>
      <div className="bold">{bill.supplier.name}</div>
      <div style={{ fontSize: "10px" }}>Tel: {bill.supplier.phoneNumber}</div>

      <div className="divider" />
      <div className="section-title">ITEMS RECEIVED:</div>
      {bill.stocks.map((stock, i) => (
        <div key={i} className="item">
          <div className="item-header">{stock.grnNumber}</div>
          <div className="item-detail">{stock.product.name}</div>
          <div className="item-detail">
            {stock.quantityAdded.toLocaleString()} {stock.measuringUnit} @{" "}
            {formatCurrency(stock.buyingPricePerUnit)}
          </div>
          <div className="item-detail bold">
            Line Total: {formatCurrency(stock.totalCost)}
          </div>
        </div>
      ))}

      <div className="divider" />

      <div className="row bold">
        <span>TOTAL COST:</span>
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
            <div className="row" key={i} style={{ fontSize: "10px" }}>
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
        <span>Status:</span>
        <span className="bold">{bill.paymentStatus}</span>
      </div>

      {bill.notes && (
        <>
          <div className="divider" />
          <div className="bold" style={{ fontSize: "10px" }}>
            Notes:
          </div>
          <div style={{ fontSize: "10px", wordWrap: "break-word" }}>
            {bill.notes}
          </div>
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

export function printBillGRN(
  bill: BillGRNReceiptProps["bill"],
  shopSettings: BillGRNReceiptProps["shopSettings"]
) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  const totalCost = Number(bill.totalCost);
  const amountPaid = Number(bill.amountPaid);
  const balance = Math.max(0, totalCost - amountPaid);
  const paymentBreakdown = getPaymentBreakdown(bill.payments || []);

  const stockRows = bill.stocks
    .map(
      (stock) => `
    <div class="item">
      <div class="item-header">${escapeHtml(stock.grnNumber)}</div>
      <div class="item-detail">${escapeHtml(stock.product.name)}</div>
      <div class="item-detail">
        ${stock.quantityAdded.toLocaleString()} ${escapeHtml(stock.measuringUnit)} @ ${formatCurrencyString(stock.buyingPricePerUnit)}
      </div>
      <div class="item-detail bold">
        Line Total: ${formatCurrencyString(stock.totalCost)}
      </div>
    </div>
  `
    )
    .join("");

  const paymentRows = paymentBreakdown
    .map(
      (p) => `
    <div class="row" style="font-size:10px">
      <span>${escapeHtml(p.label)}:</span>
      <span>${formatCurrencyString(p.amount)}</span>
    </div>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill GRN - ${escapeHtml(bill.billNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: monospace; font-size: 12px; line-height: 1.4; color: #000; width: 76mm; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-top: 2px solid #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    .title { font-size: 14px; font-weight: bold; }
    .section-title { font-weight: bold; margin-top: 6px; margin-bottom: 2px; border-bottom: 1px dashed #000; padding-bottom: 2px; }
    .item { margin: 4px 0; padding-bottom: 4px; border-bottom: 1px dotted #ccc; }
    .item-header { font-weight: bold; margin-bottom: 2px; }
    .item-detail { font-size: 10px; margin: 1px 0; padding-left: 4px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${escapeHtml(shopSettings.shopName)}</div>
    <div>${escapeHtml(shopSettings.address)}</div>
    <div>Tel: ${escapeHtml(shopSettings.phone)}</div>
  </div>

  <div class="double-divider"></div>
  <div class="center bold title" style="text-decoration:underline">SUPPLIER BILL / GRN</div>
  <div class="divider"></div>

  <div class="row"><span class="bold">Bill #:</span><span>${escapeHtml(bill.billNumber)}</span></div>
  <div class="row"><span class="bold">Date:</span><span>${formatDateTimeString(bill.createdAt)}</span></div>
  ${bill.supplierInvoiceRef ? `<div class="row"><span class="bold">Inv. Ref:</span><span>${escapeHtml(bill.supplierInvoiceRef)}</span></div>` : ""}

  <div class="divider"></div>
  <div class="section-title">Supplier:</div>
  <div class="bold">${escapeHtml(bill.supplier.name)}</div>
  <div style="font-size:10px">Tel: ${escapeHtml(bill.supplier.phoneNumber)}</div>

  <div class="divider"></div>
  <div class="section-title">ITEMS RECEIVED:</div>
  ${stockRows}

  <div class="divider"></div>

  <div class="row bold">
    <span>TOTAL COST:</span>
    <span>${formatCurrencyString(totalCost)}</span>
  </div>

  ${
    paymentRows
      ? `<div class="divider"></div>
  <div class="bold" style="font-size:10px">PAYMENT DETAILS:</div>
  ${paymentRows}
  <div class="divider"></div>`
      : ""
  }

  <div class="row">
    <span>Total Paid:</span>
    <span class="bold">${formatCurrencyString(amountPaid)}</span>
  </div>

  ${
    balance > 0
      ? `<div class="row bold">
    <span>Balance Due:</span>
    <span>${formatCurrencyString(balance)}</span>
  </div>`
      : ""
  }

  <div class="row">
    <span>Status:</span>
    <span class="bold">${escapeHtml(bill.paymentStatus)}</span>
  </div>

  ${
    bill.notes
      ? `<div class="divider"></div>
  <div class="bold" style="font-size:10px">Notes:</div>
  <div style="font-size:10px;word-wrap:break-word">${escapeHtml(bill.notes)}</div>`
      : ""
  }

  <div class="center" style="margin-top:8px">
    <div>Received By: _______________</div>
    <div style="margin-top:16px">Signature: _______________</div>
  </div>

  <div class="divider" style="margin-top:12px"></div>
  <div class="center" style="font-size:10px">
    Generated on ${formatDateTimeString(new Date())}
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ─── Helper Functions ────────────────────────────────────────────

function escapeHtml(text: string | undefined): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatCurrencyString(amount: number): string {
  const num = Number(amount);
  if (isNaN(num)) return "Rs. 0.00";
  return `Rs. ${num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTimeString(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}