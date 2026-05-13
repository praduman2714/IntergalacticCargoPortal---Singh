import { NextResponse } from "next/server";
import { sortCargoForApi } from "@/lib/cargo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CargoRow = {
  id: string;
  manifestDate: Date;
  cargoId: string;
  destination: string;
  weightKg: number;
  createdAt: Date;
};

export async function GET() {
  const cargo = await prisma.$queryRaw<CargoRow[]>`
    SELECT "id", "manifestDate", "cargoId", "destination", "weightKg", "createdAt"
    FROM "Cargo"
  `;

  return NextResponse.json({
    cargo: sortCargoForApi(cargo)
  });
}
