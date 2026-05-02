"use client";

import JsBarcode from "jsbarcode";
import { formatCurrency } from "@/lib/format";

interface LabelItem {
  grnNumber: string;
  productName: string;
  sellingPricePerUnit: number;
  measuringUnit: string;
}

interface PrintBarcodeLabelsOptions {
  items: LabelItem[];
  quantityPerItem: number;
  labelWidthMm: number;
  labelHeightMm: number;
  shopName: string;
}

function generateBarcodeSVG(value: string, labelHeightMm: number): string {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  // Xprinter XP-365B is 203 DPI — 1mm = ~8 dots
  // Bar width of 2 pixels = ~0.25mm per bar, which is well within
  // the minimum bar width readable at 203 DPI
  // Barcode height: use ~40% of label height in dots, minimum 24px
  const barcodeHeightPx = Math.max(
    24,
    Math.round(((labelHeightMm * 0.4) * 8) / (96 / 25.4))
  );

  JsBarcode(svg, value, {
    format: "CODE128",
    width: 2, // 2px per bar = ~0.25mm at 203 DPI — crisp and scannable
    height: barcodeHeightPx,
    displayValue: false,
    margin: 0,
  });
  return svg.outerHTML;
}

export function printBarcodeLabels(options: PrintBarcodeLabelsOptions) {
  const {
    items,
    quantityPerItem,
    labelWidthMm,
    labelHeightMm,
    shopName,
  } = options;

  // Build HTML document with labels
  let labelsHTML = "";

  for (const item of items) {
    for (let i = 0; i < quantityPerItem; i++) {
      const barcodeSVG = generateBarcodeSVG(item.grnNumber, labelHeightMm);
      const priceDisplay = `${formatCurrency(item.sellingPricePerUnit)} / ${item.measuringUnit}`;

      labelsHTML += `
        <div class="label">
          <div class="shop-name">${shopName}</div>
          <div class="product-name">${item.productName}</div>
          <div class="barcode-container">${barcodeSVG}</div>
          <div class="grn-number">${item.grnNumber}</div>
          <div class="price-unit">${priceDisplay}</div>
        </div>
      `;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${labelWidthMm}mm ${labelHeightMm}mm;
          margin: 0;
          padding: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: monospace;
        }
        .label {
          width: ${labelWidthMm}mm;
          height: ${labelHeightMm}mm;
          overflow: hidden;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          padding: 1mm;
          font-family: monospace;
        }
        .label:last-child {
          page-break-after: auto;
        }
        .shop-name {
          font-size: 7px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          border-bottom: 0.5px solid #ccc;
          padding-bottom: 1px;
          margin-bottom: 1px;
        }
        .product-name {
          font-size: 8px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 1px;
        }
        .barcode-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 1px 0;
        }
        .barcode-container svg {
          width: 100%;
          height: auto;
          max-width: 100%;
        }
        .grn-number {
          font-size: 6px;
          text-align: center;
          letter-spacing: 1px;
          color: #333;
        }
        .price-unit {
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          margin-top: auto;
        }
      </style>
    </head>
    <body>
      ${labelsHTML}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
