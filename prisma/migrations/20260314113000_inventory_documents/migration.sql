-- AlterTable
ALTER TABLE "Movement"
ADD COLUMN "fromLocation" TEXT,
ADD COLUMN "toLocation" TEXT,
ADD COLUMN "note" TEXT,
ADD COLUMN "documentId" INTEGER;

-- CreateTable
CREATE TABLE "StockDocument" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "supplierId" INTEGER,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "StockDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDocumentLine" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "physicalCount" INTEGER,
    "stockBefore" INTEGER,
    "delta" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movement_productId_createdAt_idx" ON "Movement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Movement_type_createdAt_idx" ON "Movement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Movement_documentId_idx" ON "Movement"("documentId");

-- CreateIndex
CREATE INDEX "StockDocument_type_status_idx" ON "StockDocument"("type", "status");

-- CreateIndex
CREATE INDEX "StockDocument_createdAt_idx" ON "StockDocument"("createdAt");

-- CreateIndex
CREATE INDEX "StockDocument_supplierId_idx" ON "StockDocument"("supplierId");

-- CreateIndex
CREATE INDEX "StockDocumentLine_documentId_idx" ON "StockDocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "StockDocumentLine_productId_idx" ON "StockDocumentLine"("productId");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocumentLine" ADD CONSTRAINT "StockDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocumentLine" ADD CONSTRAINT "StockDocumentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
