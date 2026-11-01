// Very simple in-memory rate limiter (not production ready)
const requests = new Map<string, { count: number; lastRequest: number }>();

export function rateLimiter(ip: string, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = requests.get(ip) || { count: 0, lastRequest: now };

  if (now - entry.lastRequest > windowMs) {
    // Reset window
    entry.count = 1;
    entry.lastRequest = now;
  } else {
    entry.count++;
  }

  requests.set(ip, entry);

  return entry.count <= limit;
}
