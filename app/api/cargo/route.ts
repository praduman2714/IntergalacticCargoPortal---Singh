import { NextResponse } from "next/server";
import { sortCargoForApi } from "@/lib/cargo";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const CARGO_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

type CargoRow = {
  id: string;
  manifestDate: Date;
  cargoId: string;
  destination: string;
  weightKg: number;
  createdAt: Date;
};

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(`cargo:${getClientIp(request)}`, CARGO_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": CARGO_RATE_LIMIT.limit.toString(),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  const cargo = await prisma.$queryRaw<CargoRow[]>`
    SELECT "id", "manifestDate", "cargoId", "destination", "weightKg", "createdAt"
    FROM "Cargo"
  `;

  return NextResponse.json(
    {
      cargo: sortCargoForApi(cargo)
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": CARGO_RATE_LIMIT.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString()
      }
    }
  );
}
