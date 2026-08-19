interface Bucket { count: number; resetAt: number; }

export class AuthRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly windowMs: number, private readonly maxAttempts: number) {}

  consume(key: string): boolean {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.maxAttempts) return false;
    current.count += 1;
    return true;
  }
}
