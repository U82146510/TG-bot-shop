const userRateLimit = new Map<number, number[]>();

export function checkRateLimit(userId: number, limit = 30, windowMs = 60000): boolean {
    const now = Date.now();
    const timestamps = userRateLimit.get(userId) || [];

    const recent = timestamps.filter(ts => now - ts < windowMs);

    if (recent.length >= limit) return false;


    recent.push(now);
    userRateLimit.set(userId, recent);

    return true;
}
