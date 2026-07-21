import { createHash } from "node:crypto";

export interface LoginRateLimitOptions {
  identifierAttempts: number;
  ipAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface LoginAttempt {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const DEFAULT_OPTIONS: LoginRateLimitOptions = {
  identifierAttempts: 5,
  ipAttempts: 25,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

export class LoginRateLimiter {
  private readonly attempts = new Map<string, LoginAttempt>();

  constructor(
    private readonly options: LoginRateLimitOptions = DEFAULT_OPTIONS,
    private readonly now: () => number = Date.now,
  ) {}

  isBlocked(login: string, ipAddress: string) {
    const now = this.now();
    this.removeExpired(now);
    return this.keys(login, ipAddress).some(({ key }) => {
      const attempt = this.attempts.get(key);
      return Boolean(attempt && attempt.blockedUntil > now);
    });
  }

  registerFailure(login: string, ipAddress: string) {
    const now = this.now();
    for (const { key, maximum } of this.keys(login, ipAddress)) {
      const current = this.attempts.get(key);
      const attempt =
        !current || now - current.windowStartedAt >= this.options.windowMs
          ? { attempts: 0, windowStartedAt: now, blockedUntil: 0 }
          : current;

      attempt.attempts += 1;
      if (attempt.attempts >= maximum) attempt.blockedUntil = now + this.options.blockMs;
      this.attempts.set(key, attempt);
    }
  }

  registerSuccess(login: string) {
    this.attempts.delete(this.identifierKey(login));
  }

  private keys(login: string, ipAddress: string) {
    return [
      { key: this.identifierKey(login), maximum: this.options.identifierAttempts },
      { key: `ip:${ipAddress || "unknown"}`, maximum: this.options.ipAttempts },
    ];
  }

  private identifierKey(login: string) {
    const digest = createHash("sha256").update(login.trim().toLocaleLowerCase("pt-BR")).digest("hex");
    return `login:${digest}`;
  }

  private removeExpired(now: number) {
    for (const [key, attempt] of this.attempts) {
      const windowExpired = now - attempt.windowStartedAt >= this.options.windowMs;
      if (windowExpired && attempt.blockedUntil <= now) this.attempts.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
