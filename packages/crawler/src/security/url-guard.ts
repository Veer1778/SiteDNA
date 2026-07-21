import { isIPv4, isIPv6 } from "node:net";
import { promises as dns } from "node:dns";

/** Thrown when a URL is structurally invalid or uses an unsupported scheme. */
export class UrlValidationError extends Error {}

/** Thrown when a hostname resolves to (or a redirect targets) a private/reserved IP address. */
export class SsrfError extends Error {}

/**
 * Parses and normalizes a crawl target: requires `http`/`https`, and strips the fragment (which
 * never reaches the server and would otherwise make two logically-identical URLs compare
 * unequal).
 */
export function normalizeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UrlValidationError(`not a valid URL: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError(`unsupported protocol "${url.protocol}" for ${input}`);
  }
  url.hash = "";
  return url;
}

function parseIPv4Octets(address: string): [number, number, number, number] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets as [number, number, number, number];
}

/** Expands any valid IPv6 textual representation (incl. `::` compression and embedded IPv4) to 8 hextets. */
function expandIPv6(address: string): number[] | null {
  const withoutZone = address.split("%")[0] ?? address;
  const halves = withoutZone.split("::");
  if (halves.length > 2) return null;

  const parseHextets = (segment: string): number[] | null => {
    if (segment === "") return [];
    const groups = segment.split(":");
    const hextets: number[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]!;
      if (i === groups.length - 1 && group.includes(".")) {
        const octets = parseIPv4Octets(group);
        if (!octets) return null;
        hextets.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
      hextets.push(Number.parseInt(group, 16));
    }
    return hextets;
  };

  if (halves.length === 1) {
    const hextets = parseHextets(halves[0]!);
    return hextets && hextets.length === 8 ? hextets : null;
  }

  const head = parseHextets(halves[0]!);
  const tail = parseHextets(halves[1]!);
  if (!head || !tail) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  return [...head, ...Array(missing).fill(0), ...tail];
}

/**
 * True for any IPv4/IPv6 address that is loopback, link-local, RFC1918/unique-local, unspecified,
 * multicast, or otherwise not routable on the public internet. Used to block SSRF via crawl
 * targets or redirects that resolve inside the deploying network. Fails closed: an address this
 * function cannot parse is treated as unsafe.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const octets = parseIPv4Octets(ip);
    if (!octets) return true;
    const [a, b] = octets;
    return (
      a === 127 || // loopback
      a === 10 || // RFC1918
      (a === 172 && b >= 16 && b <= 31) || // RFC1918
      (a === 192 && b === 168) || // RFC1918
      (a === 169 && b === 254) || // link-local
      a === 0 || // "this network"
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast (224-239) + reserved (240-255)
    );
  }

  if (isIPv6(ip)) {
    const hextets = expandIPv6(ip);
    if (!hextets) return true;

    const isIPv4Mapped = hextets.slice(0, 5).every((h) => h === 0) && hextets[5] === 0xffff;
    if (isIPv4Mapped) {
      const h6 = hextets[6]!;
      const h7 = hextets[7]!;
      const mapped = [(h6 >> 8) & 0xff, h6 & 0xff, (h7 >> 8) & 0xff, h7 & 0xff].join(".");
      return isPrivateOrReservedIp(mapped);
    }

    if (hextets.every((h) => h === 0)) return true; // :: unspecified
    if (hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1) return true; // ::1 loopback
    if ((hextets[0]! & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((hextets[0]! & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    return false;
  }

  return true;
}

export type DnsLookup = (hostname: string) => Promise<{ address: string; family: number }>;

const defaultLookup: DnsLookup = (hostname) => dns.lookup(hostname);

export interface ResolveAndValidateHostOptions {
  /**
   * Test-only escape hatch: skip the private/reserved-IP check. Never set outside of tests —
   * this exists so the crawler's own integration test can legitimately target `127.0.0.1`.
   */
  allowPrivateNetwork?: boolean;
}

/**
 * Resolves `hostname` to an IP address via `lookupFn` (defaults to `dns.lookup`, injectable so
 * tests can supply canned addresses without real DNS/network access) and throws {@link SsrfError}
 * if that address is private/reserved, unless `allowPrivateNetwork` is set.
 */
export async function resolveAndValidateHost(
  hostname: string,
  lookupFn: DnsLookup = defaultLookup,
  options: ResolveAndValidateHostOptions = {},
): Promise<string> {
  const { address } = await lookupFn(hostname);
  if (!options.allowPrivateNetwork && isPrivateOrReservedIp(address)) {
    throw new SsrfError(
      `refusing to connect to ${hostname}: resolves to private/reserved address ${address}`,
    );
  }
  return address;
}
