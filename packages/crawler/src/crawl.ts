import { chromium } from "playwright";
import type { APIRequestContext, BrowserContext, Page } from "playwright";

import { type CrawlLogger, noopLogger } from "./security/log.js";
import { isAllowedByRobots, parseRobotsTxt } from "./security/robots.js";
import { type DnsLookup, normalizeUrl, resolveAndValidateHost } from "./security/url-guard.js";
import {
  type AssetRef,
  COMPUTED_STYLE_SELECTORS,
  type ComputedStyleEntry,
  type CrawlArtifact,
  CrawlArtifactSchema,
  type FaviconCandidate,
  type Stylesheet,
} from "./schema.js";

export const DEFAULT_USER_AGENT = "BrandKitAI/0.1 (+https://github.com/Veer1778/SiteDNA)";
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 15_000;
export const DEFAULT_TOTAL_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
/** Cap on how many discovered assets get a HEAD request for content-type, to bound crawl time. */
const MAX_ASSET_HEAD_REQUESTS = 50;

export class CrawlTimeoutError extends Error {}
export class RobotsDisallowedError extends Error {}
export class TooManyRedirectsError extends Error {}

export interface CrawlOptions {
  /** Whether to fetch and honor robots.txt before crawling. Defaults to `true`. */
  respectRobotsTxt?: boolean;
  /** Test-only: skip the SSRF private/reserved-IP guard. Never set outside of tests. */
  allowPrivateNetwork?: boolean;
  navigationTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxRedirects?: number;
  maxResponseBytes?: number;
  userAgent?: string;
  /** Injectable DNS lookup, for tests. Defaults to `dns.promises.lookup`. */
  dnsLookup?: DnsLookup;
  onLog?: CrawlLogger;
}

async function guardedHead(
  request: APIRequestContext,
  url: string,
  dnsLookup: DnsLookup | undefined,
  allowPrivateNetwork: boolean,
  hostCache: Map<string, string>,
): Promise<{ contentType: string | null } | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  try {
    if (!hostCache.has(parsed.hostname)) {
      const ip = await resolveAndValidateHost(parsed.hostname, dnsLookup, {
        allowPrivateNetwork,
      });
      hostCache.set(parsed.hostname, ip);
    }
  } catch {
    return null;
  }
  try {
    const response = await request.head(url, { timeout: 5_000 });
    return { contentType: response.headers()["content-type"] ?? null };
  } catch {
    return null;
  }
}

function classifyAsset(url: string, contentType: string | null): AssetRef["kind"] {
  const lower = url.toLowerCase();
  if (contentType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/.test(lower)) {
    return "image";
  }
  if (contentType?.startsWith("font/") || /\.(woff2?|ttf|otf|eot)(\?|$)/.test(lower)) {
    return "font";
  }
  if (/favicon|apple-touch-icon|\.ico(\?|$)/.test(lower)) return "icon";
  return "other";
}

async function extractStylesheets(
  page: Page,
  request: APIRequestContext,
  dnsLookup: DnsLookup | undefined,
  allowPrivateNetwork: boolean,
  log: CrawlLogger,
): Promise<Stylesheet[]> {
  const linkedHrefs = await page.$$eval("link[rel='stylesheet'][href]", (links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );
  const inlineContents = await page.$$eval("style", (styles) =>
    styles.map((style) => style.textContent ?? ""),
  );

  const linked: Stylesheet[] = [];
  for (const href of linkedHrefs) {
    try {
      const parsed = new URL(href);
      await resolveAndValidateHost(parsed.hostname, dnsLookup, { allowPrivateNetwork });
      const response = await request.get(href, { timeout: 10_000 });
      linked.push({ href, content: await response.text() });
    } catch (error) {
      log({
        level: "warn",
        step: "stylesheet-fetch",
        message: `skipping stylesheet ${href}: ${(error as Error).message}`,
      });
    }
  }

  const inline: Stylesheet[] = inlineContents.map((content) => ({ href: null, content }));
  return [...linked, ...inline];
}

function extractFontUrlsFromCss(css: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const fontFaceBlocks = css.match(/@font-face\s*{[^}]*}/gi) ?? [];
  for (const block of fontFaceBlocks) {
    const matches = block.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of matches) {
      try {
        urls.add(new URL(match[1]!, baseUrl).toString());
      } catch {
        // ignore unparseable url() values (e.g. data: URIs handled elsewhere)
      }
    }
  }
  return [...urls];
}

async function extractComputedStyles(page: Page): Promise<ComputedStyleEntry[]> {
  const selectors = [...COMPUTED_STYLE_SELECTORS];
  return page.evaluate((selectors) => {
    return selectors.map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return { selector, styles: null };
      const cs = getComputedStyle(el);
      return {
        selector,
        styles: {
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow,
          border: cs.border,
          borderColor: cs.borderColor,
          padding: cs.padding,
          margin: cs.margin,
        },
      };
    });
  }, selectors);
}

async function extractFaviconCandidates(page: Page): Promise<FaviconCandidate[]> {
  return page.$$eval("link[rel]", (links) =>
    links
      .filter((link) => /icon/i.test(link.getAttribute("rel") ?? ""))
      .map((link) => ({
        url: (link as HTMLLinkElement).href,
        rel: link.getAttribute("rel") ?? "",
        sizes: link.getAttribute("sizes"),
      })),
  );
}

async function setUpRequestGuard(
  context: BrowserContext,
  page: Page,
  options: Required<
    Pick<CrawlOptions, "maxRedirects" | "maxResponseBytes" | "allowPrivateNetwork">
  > & { dnsLookup: DnsLookup | undefined },
  log: CrawlLogger,
): Promise<void> {
  const hostCache = new Map<string, string>();
  let mainFrameRedirects = 0;

  await context.route("**/*", async (route) => {
    const request = route.request();
    let parsed: URL;
    try {
      parsed = new URL(request.url());
    } catch {
      return route.abort("blockedbyclient");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      log({ level: "warn", step: "blocked-scheme", message: `blocked ${request.url()}` });
      return route.abort("blockedbyclient");
    }

    if (request.redirectedFrom() && request.frame() === page.mainFrame()) {
      mainFrameRedirects += 1;
      log({
        level: "info",
        step: "redirect",
        message: `following redirect to ${request.url()}`,
        meta: { count: mainFrameRedirects },
      });
      if (mainFrameRedirects > options.maxRedirects) {
        log({ level: "error", step: "too-many-redirects", message: request.url() });
        return route.abort("blockedbyclient");
      }
    }

    try {
      let ip = hostCache.get(parsed.hostname);
      if (!ip) {
        ip = await resolveAndValidateHost(parsed.hostname, options.dnsLookup, {
          allowPrivateNetwork: options.allowPrivateNetwork,
        });
        hostCache.set(parsed.hostname, ip);
      }
    } catch (error) {
      log({
        level: "warn",
        step: "blocked-ssrf",
        message: `blocked ${request.url()}: ${(error as Error).message}`,
      });
      return route.abort("blockedbyclient");
    }

    try {
      const response = await route.fetch();
      const contentLength = response.headers()["content-length"];
      if (contentLength && Number(contentLength) > options.maxResponseBytes) {
        log({
          level: "warn",
          step: "blocked-size",
          message: `blocked ${request.url()}: response exceeds ${options.maxResponseBytes} bytes`,
        });
        return route.abort("blockedbyclient");
      }
      return route.fulfill({ response });
    } catch (error) {
      log({
        level: "error",
        step: "fetch-failed",
        message: `${request.url()}: ${(error as Error).message}`,
      });
      return route.abort("failed");
    }
  });
}

/**
 * Crawls a single page: navigates with Chromium behind an SSRF/redirect/size guard, renders it,
 * and captures everything `packages/extractor` (Phase 2) needs. No storage, no extraction logic
 * — this package's only job is producing a normalized, validated {@link CrawlArtifact}.
 */
export async function crawlUrl(input: string, options: CrawlOptions = {}): Promise<CrawlArtifact> {
  const log = options.onLog ?? noopLogger;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const navigationTimeoutMs = options.navigationTimeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS;
  const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const allowPrivateNetwork = options.allowPrivateNetwork ?? false;

  const url = normalizeUrl(input);
  log({ level: "info", step: "normalize", message: url.toString() });

  await resolveAndValidateHost(url.hostname, options.dnsLookup, { allowPrivateNetwork });

  if (options.respectRobotsTxt ?? true) {
    const robotsUrl = new URL("/robots.txt", url);
    try {
      const robotsResponse = await fetch(robotsUrl, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(5_000),
      });
      if (robotsResponse.ok) {
        const rules = parseRobotsTxt(await robotsResponse.text());
        const allowed = isAllowedByRobots(rules, userAgent, url.pathname);
        log({ level: "info", step: "robots", message: `robots.txt allows=${allowed}` });
        if (!allowed) {
          throw new RobotsDisallowedError(`${url.toString()} is disallowed by robots.txt`);
        }
      } else {
        log({ level: "info", step: "robots", message: "no robots.txt (non-2xx); proceeding" });
      }
    } catch (error) {
      if (error instanceof RobotsDisallowedError) throw error;
      log({
        level: "warn",
        step: "robots",
        message: `robots.txt fetch failed, proceeding: ${(error as Error).message}`,
      });
    }
  }

  const browser = await chromium.launch();
  const crawlPromise = (async (): Promise<CrawlArtifact> => {
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1440, height: 900 },
    });
    try {
      const page = await context.newPage();
      await setUpRequestGuard(
        context,
        page,
        { maxRedirects, maxResponseBytes, allowPrivateNetwork, dnsLookup: options.dnsLookup },
        log,
      );

      log({ level: "info", step: "navigate", message: url.toString() });
      const response = await page.goto(url.toString(), {
        waitUntil: "networkidle",
        timeout: navigationTimeoutMs,
      });
      if (!response) {
        throw new Error(`navigation to ${url.toString()} produced no response`);
      }

      const redirectChain: string[] = [];
      let currentRequest = response.request();
      for (;;) {
        redirectChain.unshift(currentRequest.url());
        const previous = currentRequest.redirectedFrom();
        if (!previous) break;
        currentRequest = previous;
      }
      if (redirectChain.length - 1 > maxRedirects) {
        throw new TooManyRedirectsError(
          `${url.toString()} redirected ${redirectChain.length - 1} times (max ${maxRedirects})`,
        );
      }

      const finalUrl = page.url();
      const html = await page.content();
      const title = await page.title();
      const description = await page
        .$eval('meta[name="description"]', (el) => (el as HTMLMetaElement).content)
        .catch(() => null);

      const stylesheets = await extractStylesheets(
        page,
        context.request,
        options.dnsLookup,
        allowPrivateNetwork,
        log,
      );
      const computedStyles = await extractComputedStyles(page);
      const faviconCandidates = await extractFaviconCandidates(page);

      const images = await page.$$eval("img[src]", (imgs) =>
        imgs.map((img) => ({
          url: (img as HTMLImageElement).src,
          width: (img as HTMLImageElement).naturalWidth || null,
          height: (img as HTMLImageElement).naturalHeight || null,
        })),
      );

      const fontUrls = stylesheets.flatMap((sheet) =>
        extractFontUrlsFromCss(sheet.content, sheet.href ?? finalUrl),
      );

      const hostCache = new Map<string, string>();
      const assetCandidates = new Map<string, { width: number | null; height: number | null }>();
      for (const image of images) {
        if (!assetCandidates.has(image.url)) {
          assetCandidates.set(image.url, { width: image.width, height: image.height });
        }
      }
      for (const fontUrl of fontUrls) {
        if (!assetCandidates.has(fontUrl)) {
          assetCandidates.set(fontUrl, { width: null, height: null });
        }
      }
      for (const favicon of faviconCandidates) {
        if (!assetCandidates.has(favicon.url)) {
          assetCandidates.set(favicon.url, { width: null, height: null });
        }
      }

      const assets: AssetRef[] = [];
      let headRequestsMade = 0;
      for (const [assetUrl, dims] of assetCandidates) {
        let contentType: string | null = null;
        if (headRequestsMade < MAX_ASSET_HEAD_REQUESTS) {
          headRequestsMade += 1;
          const head = await guardedHead(
            context.request,
            assetUrl,
            options.dnsLookup,
            allowPrivateNetwork,
            hostCache,
          );
          contentType = head?.contentType ?? null;
        }
        assets.push({
          url: assetUrl,
          kind: classifyAsset(assetUrl, contentType),
          contentType,
          width: dims.width,
          height: dims.height,
        });
      }

      log({ level: "info", step: "screenshot", message: "capturing screenshots" });
      const screenshotFullPage = await page.screenshot({ fullPage: true, type: "png" });
      const screenshotViewport = await page.screenshot({ fullPage: false, type: "png" });

      const artifact: CrawlArtifact = {
        sourceUrl: url.toString(),
        finalUrl,
        redirectChain,
        crawledAt: new Date().toISOString(),
        html,
        meta: { title: title || null, description },
        stylesheets,
        computedStyles,
        screenshotFullPage,
        screenshotViewport,
        assets,
        faviconCandidates,
      };

      log({ level: "info", step: "done", message: finalUrl });
      return CrawlArtifactSchema.parse(artifact);
    } finally {
      await context.close();
    }
  })();

  try {
    return await Promise.race([
      crawlPromise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new CrawlTimeoutError(`crawl of ${url.toString()} exceeded ${totalTimeoutMs}ms`),
            ),
          totalTimeoutMs,
        );
      }),
    ]);
  } finally {
    await browser.close();
  }
}
