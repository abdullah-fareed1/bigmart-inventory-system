// src/components/receipts/grn-receipt.tsx
"use client";

import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────

interface GRNReceiptProps {
  stock: {
    grnNumber: string;
    suppliedDate: Date | string;
    quantityAdded: number | string;
    quantityRemaining: number | string;
    measuringUnit: string;
    buyingPricePerUnit: number | string;
    sellingPricePerUnit: number | string;
    totalCost: number | string;
    amountPaid: number | string;
    paymentStatus: string;
    notes?: string | null;
    product: { name: string };
    supplier: { name: string; phoneNumber: string };
  };
  shopSettings: {
    shopName: string;
    address: string;
    phone: string;
  };
}

// ─── Component ───────────────────────────────────────────────────

export function GRNReceipt({ stock, shopSettings }: GRNReceiptProps) {
  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const balance = totalCost - amountPaid;

  return (
    <div className="grn-receipt" style={{ fontFamily: "monospace", width: "302px", padding: "8px" }}>
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
          .grn-receipt .right { text-align: right; }
          .grn-receipt .bold { font-weight: bold; }
          .grn-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .grn-receipt .double-divider { border-top: 2px solid #000; margin: 4px 0; }
          .grn-receipt .row { display: flex; justify-content: space-between; }
          .grn-receipt .title { font-size: 14px; font-weight: bold; }
        `}
      </style>

      {/* Shop Header */}
      <div className="center">
        <div className="title">{shopSettings.shopName}</div>
        <div>{shopSettings.address}</div>
        <div>Tel: {shopSettings.phone}</div>
      </div>

      <div className="double-divider" />

      {/* GRN Header */}
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

      {/* Supplier Info */}
      <div className="bold">Supplier:</div>
      <div>{stock.supplier.name}</div>
      <div>Tel: {stock.supplier.phoneNumber}</div>

      <div className="divider" />

      {/* Product Info */}
      <div className="bold">Product:</div>
      <div>{stock.product.name}</div>

      <div className="divider" />

      {/* Stock Details */}
      <div className="row">
        <span>Quantity:</span>
        <span>
          {formatQuantity(stock.quantityAdded)} {stock.measuringUnit}
        </span>
      </div>
      <div className="row">
        <span>Buying Price/Unit:</span>
        <span>{formatCurrency(stock.buyingPricePerUnit)}</span>
      </div>
      <div className="row">
        <span>Selling Price/Unit:</span>
        <span>{formatCurrency(stock.sellingPricePerUnit)}</span>
      </div>

      <div className="double-divider" />

      {/* Payment Summary */}
      <div className="row bold">
        <span>Total Cost:</span>
        <span>{formatCurrency(totalCost)}</span>
      </div>
      <div className="row">
        <span>Amount Paid:</span>
        <span>{formatCurrency(amountPaid)}</span>
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

      {/* Notes */}
      {stock.notes && (
        <>
          <div className="bold">Notes:</div>
          <div>{stock.notes}</div>
          <div className="divider" />
        </>
      )}

      {/* Footer */}
      <div className="center" style={{ marginTop: "8px" }}>
        <div>Received By: _______________</div>
        <div style={{ marginTop: "16px" }}>
          Signature: _______________
        </div>
      </div>

      <div className="divider" style={{ marginTop: "12px" }} />
      <div className="center" style={{ fontSize: "10px" }}>
        Generated on {formatDateTime(new Date())}
      </div>
    </div>
  );
}

/**
 * Opens a print window with the GRN receipt.
 * Call this from a button click handler.
 */
export function printGRN(
  stock: GRNReceiptProps["stock"],
  shopSettings: GRNReceiptProps["shopSettings"]
) {
  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const balance = totalCost - amountPaid;

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
  <div class="row"><span>Buying Price/Unit:</span><span>${formatCurrency(stock.buyingPricePerUnit)}</span></div>
  <div class="row"><span>Selling Price/Unit:</span><span>${formatCurrency(stock.sellingPricePerUnit)}</span></div>
  <div class="double-divider"></div>
  <div class="row bold"><span>Total Cost:</span><span>${formatCurrency(totalCost)}</span></div>
  <div class="row"><span>Amount Paid:</span><span>${formatCurrency(amountPaid)}</span></div>
  ${balance > 0 ? `<div class="row bold"><span>Balance Due:</span><span>${formatCurrency(balance)}</span></div>` : ""}
  <div class="row"><span>Payment Status:</span><span class="bold">${stock.paymentStatus}</span></div>
  <div class="double-divider"></div>
  ${stock.notes ? `<div class="bold">Notes:</div><div>${stock.notes}</div><div class="divider"></div>` : ""}
  <div class="center" style="margin-top:8px">
    <div>Received By: _______________</div>
    <div style="margin-top:16px">Signature: _______________</div>
  </div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="center" style="font-size:10px">Generated on ${formatDateTime(new Date())}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}