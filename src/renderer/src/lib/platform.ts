export function modKeyFor(platform: string): string {
  return /windows|win32|win64/i.test(platform) ? "Ctrl" : "⌘";
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

export const modKey = modKeyFor(detectPlatform());
