import { describe, it, expect } from "vitest";
import { contentSecurityPolicy } from "../src/main/csp";

describe("contentSecurityPolicy", () => {
  it("never enables unsafe-eval (the condition Electron warns about)", () => {
    expect(contentSecurityPolicy(true)).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy(false)).not.toContain("unsafe-eval");
  });

  it("production locks scripts to self and blocks outbound connections", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("connect-src 'none'");
  });

  it("development allows the Vite HMR websocket and inline preamble", () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).toContain("ws:");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
});
