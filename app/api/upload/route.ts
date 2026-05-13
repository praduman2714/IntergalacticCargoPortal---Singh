import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyAuthToken } from "@/lib/auth";
import { parseManifestText } from "@/lib/cargo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

async function getManifestText(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("manifest");

    if (!(file instanceof File)) {
      return null;
    }

    return file.text();
  }

  return request.text();
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let user;

  try {
    user = verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return new NextResponse("Clearance level inadequate.", { status: 403 });
  }

  const manifestText = await getManifestText(request);

  if (!manifestText) {
    return NextResponse.json({ error: "Upload requires a manifest.txt file." }, { status: 400 });
  }

  const parsedManifest = parseManifestText(manifestText);

  if (parsedManifest.invalidLines.length > 0) {
    return NextResponse.json(
      {
        error: "Manifest contains invalid lines.",
        invalidLines: parsedManifest.invalidLines
      },
      { status: 400 }
    );
  }

  const insertResults = await prisma.$transaction(
    parsedManifest.records.map((record) =>
      prisma.$executeRaw`
        INSERT INTO "Cargo" ("id", "manifestDate", "cargoId", "destination", "weightKg", "rawLine")
        VALUES (${randomUUID()}, ${record.manifestDate}, ${record.cargoId}, ${record.destination}, ${record.weightKg}, ${record.rawLine})
        ON CONFLICT ("cargoId") DO NOTHING
      `
    )
  );

  return NextResponse.json({
    savedCount: insertResults.reduce((total, count) => total + count, 0),
    skippedPrimeCargoIds: parsedManifest.skippedPrimeCargoIds
  });
}
