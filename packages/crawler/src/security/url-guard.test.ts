import { describe, expect, it } from "vitest";

import {
  isPrivateOrReservedIp,
  normalizeUrl,
  resolveAndValidateHost,
  SsrfError,
  UrlValidationError,
} from "./url-guard.js";

describe("normalizeUrl", () => {
  it("accepts http/https and strips the fragment", () => {
    expect(normalizeUrl("https://example.com/path#section").toString()).toBe(
      "https://example.com/path",
    );
    expect(normalizeUrl("http://example.com").protocol).toBe("http:");
  });

  it("rejects malformed URLs", () => {
    expect(() => normalizeUrl("not a url")).toThrow(UrlValidationError);
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow(UrlValidationError);
    expect(() => normalizeUrl("ftp://example.com")).toThrow(UrlValidationError);
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow(UrlValidationError);
  });
});

describe("isPrivateOrReservedIp", () => {
  const privateCases: Array<[string, string]> = [
    ["127.0.0.1", "loopback"],
    ["127.53.0.1", "loopback range"],
    ["169.254.169.254", "link-local (cloud metadata)"],
    ["10.0.0.1", "RFC1918 10/8"],
    ["172.16.0.1", "RFC1918 172.16/12 lower bound"],
    ["172.31.255.255", "RFC1918 172.16/12 upper bound"],
    ["192.168.1.1", "RFC1918 192.168/16"],
    ["0.0.0.0", "this network"],
    ["100.64.0.1", "carrier-grade NAT"],
    ["224.0.0.1", "multicast"],
    ["::1", "IPv6 loopback"],
    ["fe80::1", "IPv6 link-local"],
    ["fc00::1", "IPv6 unique-local"],
    ["fd12:3456:789a::1", "IPv6 unique-local (fd prefix)"],
    ["::", "IPv6 unspecified"],
    ["::ffff:127.0.0.1", "IPv4-mapped IPv6 loopback"],
    ["::ffff:169.254.1.1", "IPv4-mapped IPv6 link-local"],
  ];

  it.each(privateCases)("flags %s (%s) as private/reserved", (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(true);
  });

  const publicCases: Array<[string, string]> = [
    ["8.8.8.8", "public IPv4"],
    ["93.184.216.34", "public IPv4"],
    ["2606:4700:4700::1111", "public IPv6"],
  ];

  it.each(publicCases)("does not flag %s (%s)", (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(false);
  });
});

describe("resolveAndValidateHost", () => {
  it("rejects a hostname that resolves to a private address", async () => {
    const fakeLookup = async () => ({ address: "127.0.0.1", family: 4 });
    await expect(resolveAndValidateHost("evil.example", fakeLookup)).rejects.toThrow(SsrfError);
  });

  it("rejects a hostname resolving to link-local (cloud metadata) via injected lookup", async () => {
    const fakeLookup = async () => ({ address: "169.254.169.254", family: 4 });
    await expect(resolveAndValidateHost("metadata.example", fakeLookup)).rejects.toThrow(SsrfError);
  });

  it("accepts a hostname resolving to a public address", async () => {
    const fakeLookup = async () => ({ address: "93.184.216.34", family: 4 });
    await expect(resolveAndValidateHost("example.com", fakeLookup)).resolves.toBe("93.184.216.34");
  });

  it("allows a private address when allowPrivateNetwork is set (test-only escape hatch)", async () => {
    const fakeLookup = async () => ({ address: "127.0.0.1", family: 4 });
    await expect(
      resolveAndValidateHost("localhost", fakeLookup, { allowPrivateNetwork: true }),
    ).resolves.toBe("127.0.0.1");
  });
});
