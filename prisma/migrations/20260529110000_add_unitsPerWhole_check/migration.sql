-- Add CHECK constraint for unitsPerWhole on Stock
ALTER TABLE "Stock"
ADD CONSTRAINT "Stock_unitsPerWhole_positive_or_null"
CHECK ("unitsPerWhole" IS NULL OR "unitsPerWhole" > 0);
