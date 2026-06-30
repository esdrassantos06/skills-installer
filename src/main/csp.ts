/**
 * Content-Security-Policy for the renderer. Production locks everything to the
 * app's own origin; development additionally allows inline scripts/styles and
 * the Vite HMR websocket. Neither policy enables `unsafe-eval`.
 */
export function contentSecurityPolicy(isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    isDev ? "connect-src 'self' ws:" : "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
  ];
  return directives.join("; ");
}
