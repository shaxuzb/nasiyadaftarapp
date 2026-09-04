export function extractOtpCode(message: string): string | null {
  const value = message.trim();

  if (/^\d{6}$/.test(value)) {
    return value;
  }

  const matches = value.match(/(?<!\d)\d{6}(?!\d)/g);
  return matches?.[matches.length - 1] ?? null;
}
