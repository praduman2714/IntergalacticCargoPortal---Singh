export type ParsedCargoRecord = {
  manifestDate: Date;
  cargoId: string;
  weightKg: number;
  destination: string;
  rawLine: string;
};

const MANIFEST_LINE_PATTERN =
  /^\[(\d{4}-\d{2}-\d{2})\]\s*\|\|\s*([A-Z0-9-]+)\s*::\s*(\d+(?:\.\d+)?)\s*>>\s*(.+)$/;

export function isPrime(value: number) {
  if (value <= 1) return false;
  if (value === 2) return true;
  if (value % 2 === 0) return false;

  for (let divisor = 3; divisor <= Math.sqrt(value); divisor += 2) {
    if (value % divisor === 0) return false;
  }

  return true;
}

export function calculateCargoWeight(destination: string, weightKg: number) {
  const adjustedWeight = destination.includes("Sector-7") ? weightKg * 1.45 : weightKg;
  return Math.round(adjustedWeight);
}

export function parseManifestText(manifestText: string) {
  const records: ParsedCargoRecord[] = [];
  const skippedPrimeCargoIds: string[] = [];
  const invalidLines: string[] = [];

  for (const rawLine of manifestText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(MANIFEST_LINE_PATTERN);

    if (!match) {
      invalidLines.push(line);
      continue;
    }

    const [, manifestDate, cargoId, weight, rawDestination] = match;
    const destination = rawDestination.trim();
    const finalWeightKg = calculateCargoWeight(destination, Number(weight));

    if (isPrime(finalWeightKg)) {
      skippedPrimeCargoIds.push(cargoId);
      continue;
    }

    records.push({
      manifestDate: new Date(`${manifestDate}T00:00:00.000Z`),
      cargoId,
      weightKg: finalWeightKg,
      destination,
      rawLine: line
    });
  }

  return {
    records,
    skippedPrimeCargoIds,
    invalidLines
  };
}

export function sortCargoForApi<T extends { destination: string; weightKg: number }>(cargo: T[]) {
  return [...cargo].sort((a, b) => {
    const aIsEarth = a.destination.toLowerCase() === "earth";
    const bIsEarth = b.destination.toLowerCase() === "earth";

    if (aIsEarth && !bIsEarth) return 1;
    if (!aIsEarth && bIsEarth) return -1;

    return b.weightKg - a.weightKg;
  });
}
