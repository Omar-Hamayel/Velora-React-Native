import { expect, it } from "vitest";
import { resolveApiBaseUrl } from "../src/api/config";

it("uses the configured public HTTPS backend on a physical Android device", () => {
  expect(resolveApiBaseUrl("https://api.example.invalid/", "android", false)).toBe("https://api.example.invalid");
});
it("requires a configured URL and rejects public HTTP in release", () => {
  expect(() => resolveApiBaseUrl(undefined, "android", false)).toThrow();
  expect(() => resolveApiBaseUrl("http://203.0.113.10", "android", false, true)).toThrow();
});
it("rejects credentials, query strings and fragments in the public origin", () => {
  for (const value of ["https://user:password@api.example.invalid", "https://api.example.invalid?token=secret", "https://api.example.invalid#token"]) {
    expect(() => resolveApiBaseUrl(value, "android", false)).toThrow();
  }
});
