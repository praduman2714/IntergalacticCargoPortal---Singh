-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "manifestDate" TIMESTAMP(3) NOT NULL,
    "cargoId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "rawLine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_cargoId_key" ON "Cargo"("cargoId");
