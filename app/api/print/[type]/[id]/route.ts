// src/app/api/print/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/format";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  try {
    if (type === "receipt") {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          customer: true,
          items: true,
        },
      });

      if (!transaction) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 }
        );
      }

      // Get shop settings
      const shop = await prisma.shopSettings.findFirst();

      const data = {
        receiptNumber: transaction.receiptNumber,
        saleDateTime: transaction.saleDateTime.toISOString(),
        customerName: transaction.customer?.name || undefined,
        customerPhone: transaction.customer?.phoneNumber || undefined,
        paymentMethod: transaction.paymentMethod,
        items: transaction.items.map((item) => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          measuringUnit: item.measuringUnit,
          pricePerUnit: Number(item.pricePerUnit),
          itemDiscount: Number(item.itemDiscount),
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(transaction.subtotal),
        totalItemDiscount: Number(transaction.totalItemDiscount),
        cartDiscount: Number(transaction.cartDiscount),
        pointsRedeemed: transaction.pointsRedeemed,
        pointsRedeemedValue: Number(transaction.pointsRedeemedValue),
        totalAmount: Number(transaction.totalAmount),
        amountPaid: Number(transaction.amountPaid ?? transaction.totalAmount),
        changeGiven: Number(transaction.changeGiven ?? 0),
        pointsEarned: transaction.pointsEarned,
        shopName: shop?.shopName || "Bigmart Textiles",
        shopAddress: shop?.address || "",
        shopPhone: shop?.phone || "",
      };

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { error: "Invalid print type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Print API error:", error);
    return NextResponse.json(
      { error: "Failed to generate print data" },
      { status: 500 }
    );
  }
}