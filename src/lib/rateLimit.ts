class RateLimiter {
  private maxRequests: number;
  private timeWindowMs: number;
  private requests: number[] = [];

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
  }

  checkLimit(): void {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindowMs);
    
    if (this.requests.length >= this.maxRequests) {
      throw new Error('Too many attempts. Please try again later.');
    }
    
    this.requests.push(now);
  }
}

export const authRateLimit = new RateLimiter(5, 5 * 60 * 1000); // 5 requests per 5 minutes
