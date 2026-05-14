type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const requestCounts = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const currentEntry = requestCounts.get(key);

  if (!currentEntry || currentEntry.resetAt <= now) {
    const resetAt = now + options.windowMs;
    requestCounts.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt
    };
  }

  if (currentEntry.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: currentEntry.resetAt
    };
  }

  currentEntry.count += 1;

  return {
    allowed: true,
    remaining: options.limit - currentEntry.count,
    resetAt: currentEntry.resetAt
  };
}
