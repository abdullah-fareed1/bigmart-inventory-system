// src/components/receipts/supplier-return-receipt.tsx
"use client";

import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

interface SupplierReturnReceiptProps {
  returnData: {
    returnNumber: string;
    returnDate: Date | string;
    quantityReturned: number;
    reason: string;
    refundAmount: number;
    refundMethod: string;
    notes?: string | null;
    product: { name: string };
    supplier: { name: string; phoneNumber: string };
    stock: { grnNumber: string; measuringUnit: string; buyingPricePerUnit: number };
    creditNote?: { creditNoteNumber: string; originalAmount: number } | null;
  };
  shopSettings: {
    shopName: string;
    address: string;
    phone: string;
  };
}

const REFUND_METHOD_LABELS: Record<string, string> = {
  DEBT_OFFSET: "Debt Offset (Reduced Outstanding)",
  CASH: "Cash Refund",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_NOTE: "Credit Note",
};

export function SupplierReturnReceipt({
  returnData,
  shopSettings,
}: SupplierReturnReceiptProps) {
  const r = returnData;

  return (
    <div
      className="return-receipt"
      style={{ fontFamily: "monospace", width: "302px", padding: "8px" }}
    >
      <style>
        {`
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body { margin: 0; }
            .return-receipt { width: 100% !important; }
            .no-print { display: none !important; }
          }
          .return-receipt { font-size: 12px; line-height: 1.4; color: #000; }
          .return-receipt .center { text-align: center; }
          .return-receipt .bold { font-weight: bold; }
          .return-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .return-receipt .double-divider { border-top: 2px solid #000; margin: 4px 0; }
          .return-receipt .row { display: flex; justify-content: space-between; }
          .return-receipt .title { font-size: 14px; font-weight: bold; }
        `}
      </style>

      {/* Shop Header */}
      <div className="center">
        <div className="title">{shopSettings.shopName}</div>
        <div>{shopSettings.address}</div>
        <div>Tel: {shopSettings.phone}</div>
      </div>

      <div className="double-divider" />
      <div className="center bold title">SUPPLIER RETURN NOTE</div>
      <div className="divider" />

      <div className="row">
        <span>Return #:</span>
        <span className="bold">{r.returnNumber}</span>
      </div>
      <div className="row">
        <span>Date:</span>
        <span>{formatDateTime(r.returnDate)}</span>
      </div>
      <div className="row">
        <span>Ref GRN:</span>
        <span>{r.stock.grnNumber}</span>
      </div>

      <div className="divider" />

      <div className="bold">Supplier:</div>
      <div>{r.supplier.name}</div>
      <div>Tel: {r.supplier.phoneNumber}</div>

      <div className="divider" />

      <div className="bold">Product:</div>
      <div>{r.product.name}</div>

      <div className="divider" />

      <div className="row">
        <span>Qty Returned:</span>
        <span>{formatQuantity(r.quantityReturned, r.stock.measuringUnit)}</span>
      </div>
      <div className="row">
        <span>Unit Price:</span>
        <span>{formatCurrency(r.stock.buyingPricePerUnit)}</span>
      </div>
      <div className="row">
        <span>Reason:</span>
        <span>{r.reason}</span>
      </div>

      <div className="double-divider" />

      <div className="row bold">
        <span>Refund Amount:</span>
        <span>{formatCurrency(r.refundAmount)}</span>
      </div>
      <div className="row">
        <span>Method:</span>
        <span className="bold">
          {REFUND_METHOD_LABELS[r.refundMethod] || r.refundMethod}
        </span>
      </div>

      {r.creditNote && (
        <>
          <div className="divider" />
          <div className="row">
            <span>Credit Note #:</span>
            <span className="bold">{r.creditNote.creditNoteNumber}</span>
          </div>
          <div className="row">
            <span>Credit Amount:</span>
            <span>{formatCurrency(r.creditNote.originalAmount)}</span>
          </div>
        </>
      )}

      <div className="double-divider" />

      {r.notes && (
        <>
          <div className="bold">Notes:</div>
          <div>{r.notes}</div>
          <div className="divider" />
        </>
      )}

      <div className="center" style={{ marginTop: "8px" }}>
        <div>Authorized By: _______________</div>
        <div style={{ marginTop: "16px" }}>Signature: _______________</div>
      </div>

      <div className="divider" style={{ marginTop: "12px" }} />
      <div className="center" style={{ fontSize: "10px" }}>
        Generated on {formatDateTime(new Date())}
      </div>
    </div>
  );
}

/**
 * Print the supplier return receipt in a new window.
 */
export function printSupplierReturn(
  returnData: SupplierReturnReceiptProps["returnData"],
  shopSettings: SupplierReturnReceiptProps["shopSettings"]
) {
  const r = returnData;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Return - ${r.returnNumber}</title>
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
  <div class="center bold title">SUPPLIER RETURN NOTE</div>
  <div class="divider"></div>
  <div class="row"><span>Return #:</span><span class="bold">${r.returnNumber}</span></div>
  <div class="row"><span>Date:</span><span>${formatDateTime(r.returnDate)}</span></div>
  <div class="row"><span>Ref GRN:</span><span>${r.stock.grnNumber}</span></div>
  <div class="divider"></div>
  <div class="bold">Supplier:</div>
  <div>${r.supplier.name}</div>
  <div>Tel: ${r.supplier.phoneNumber}</div>
  <div class="divider"></div>
  <div class="bold">Product:</div>
  <div>${r.product.name}</div>
  <div class="divider"></div>
  <div class="row"><span>Qty Returned:</span><span>${formatQuantity(r.quantityReturned, r.stock.measuringUnit)}</span></div>
  <div class="row"><span>Unit Price:</span><span>${formatCurrency(r.stock.buyingPricePerUnit)}</span></div>
  <div class="row"><span>Reason:</span><span>${r.reason}</span></div>
  <div class="double-divider"></div>
  <div class="row bold"><span>Refund Amount:</span><span>${formatCurrency(r.refundAmount)}</span></div>
  <div class="row"><span>Method:</span><span class="bold">${REFUND_METHOD_LABELS[r.refundMethod] || r.refundMethod}</span></div>
  ${r.creditNote ? `
  <div class="divider"></div>
  <div class="row"><span>Credit Note #:</span><span class="bold">${r.creditNote.creditNoteNumber}</span></div>
  <div class="row"><span>Credit Amount:</span><span>${formatCurrency(r.creditNote.originalAmount)}</span></div>
  ` : ""}
  <div class="double-divider"></div>
  ${r.notes ? `<div class="bold">Notes:</div><div>${r.notes}</div><div class="divider"></div>` : ""}
  <div class="center" style="margin-top: 8px;">
    <div>Authorized By: _______________</div>
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