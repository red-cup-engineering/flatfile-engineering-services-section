/** Admit a string as an absolute http(s) URL and return it, or throw a TypeError naming `field`. */
export function assertHttpUrl(value: unknown, field?: string): string;
