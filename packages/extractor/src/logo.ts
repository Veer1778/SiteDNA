import type { CrawlArtifact, FaviconCandidate } from "@brandkit/crawler";
import type { ImageFormat, Logo, LogoAsset } from "@brandkit/shared";
import * as cheerio from "cheerio";
import sharp from "sharp";

import { type ExtractLogger, noopLogger } from "./log.js";
import { defaultFetchBytes, type FetchBytes } from "./security.js";

interface LogoCandidate {
  url: string;
  score: number;
  reasons: string[];
}

/** Above this average luminance (0-1), a logo reads as light-colored — suited to dark backgrounds. */
const LIGHT_LOGO_LUMINANCE_THRESHOLD = 0.6;
const MAX_CANDIDATES_TRIED = 5;

function resolveUrl(candidate: string, base: string): string | null {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

/**
 * Cheerio-parses `artifact.html` for logo candidates: `<img>` near `header`/`nav`, alt/class/src
 * containing "logo", and `<meta property="og:image">`. Ranked by a simple additive score, not
 * fetched yet.
 */
function collectImageCandidates(artifact: CrawlArtifact): LogoCandidate[] {
  const $ = cheerio.load(artifact.html);
  const candidates = new Map<string, LogoCandidate>();

  const addCandidate = (rawUrl: string | undefined, scoreDelta: number, reason: string) => {
    if (!rawUrl) return;
    const url = resolveUrl(rawUrl, artifact.finalUrl);
    if (!url) return;
    const existing = candidates.get(url);
    if (existing) {
      existing.score += scoreDelta;
      existing.reasons.push(reason);
    } else {
      candidates.set(url, { url, score: scoreDelta, reasons: [reason] });
    }
  };

  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src");
    if (!src) return;

    let score = 0;
    const reasons: string[] = [];
    if ($el.closest("header, nav").length > 0) {
      score += 3;
      reasons.push("near-header-nav");
    }
    const alt = ($el.attr("alt") ?? "").toLowerCase();
    const className = ($el.attr("class") ?? "").toLowerCase();
    const srcLower = src.toLowerCase();
    if (alt.includes("logo") || className.includes("logo") || srcLower.includes("logo")) {
      score += 2;
      reasons.push("logo-keyword");
    }
    if (srcLower.endsWith(".svg")) {
      score += 1;
      reasons.push("svg");
    }
    if (score > 0) addCandidate(src, score, reasons.join("+"));
  });

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) addCandidate(ogImage, 2, "og:image");

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}

function scoreFavicon(candidate: FaviconCandidate): number {
  let score = 0;
  if (candidate.rel.includes("apple-touch-icon")) score += 2;
  if (candidate.rel === "icon" || candidate.rel === "shortcut icon") score += 1;
  const sizeMatch = candidate.sizes ? /^(\d+)x\d+$/.exec(candidate.sizes) : null;
  if (sizeMatch) score += Math.min(Number(sizeMatch[1]) / 16, 10);
  return score;
}

/** Picks the best favicon from the crawler's already-provided candidates — bigger/more specific `rel` wins. */
function pickFavicon(candidates: FaviconCandidate[]): FaviconCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => scoreFavicon(b) - scoreFavicon(a))[0]!;
}

const SHARP_FORMAT_TO_IMAGE_FORMAT: Partial<Record<string, ImageFormat>> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  svg: "svg",
  gif: "gif",
  avif: "avif",
};

async function bytesToLogoAsset(url: string, bytes: Buffer): Promise<LogoAsset | null> {
  try {
    const metadata = await sharp(bytes).metadata();
    const format = metadata.format ? SHARP_FORMAT_TO_IMAGE_FORMAT[metadata.format] : undefined;
    if (!format || !metadata.width || !metadata.height) return null;
    return { url, width: metadata.width, height: metadata.height, format };
  } catch {
    return null;
  }
}

/** Average perceptual luminance (0-1) of an image, used to tell a light logo from a dark one. */
async function computeLuminance(bytes: Buffer): Promise<number | null> {
  try {
    const stats = await sharp(bytes).flatten({ background: "#ffffff" }).stats();
    const [r, g, b] = stats.channels;
    if (!r || !g || !b) return null;
    return (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255;
  } catch {
    return null;
  }
}

/**
 * Derives {@link Logo} from `artifact`: favicon from the crawler's already-provided
 * `faviconCandidates`; `light`/`dark` from the best-scoring `<img>`/`og:image` candidate found
 * by Cheerio-parsing the rendered HTML. Light vs. dark is approximated from the winning
 * candidate's own average luminance (Phase 1 only crawls once — see README) rather than a true
 * dark-mode re-crawl.
 */
export async function extractLogo(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger; fetchBytes?: FetchBytes } = {},
): Promise<Logo> {
  const log = options.onLog ?? noopLogger;
  const fetchBytes = options.fetchBytes ?? defaultFetchBytes;
  const logo: Logo = {};

  const favicon = pickFavicon(artifact.faviconCandidates);
  if (favicon) {
    const bytes = await fetchBytes(favicon.url);
    const asset = bytes ? await bytesToLogoAsset(favicon.url, bytes) : null;
    if (asset) {
      logo.favicon = asset;
      log({ level: "info", step: "logo-favicon", message: favicon.url });
    } else {
      log({
        level: "warn",
        step: "logo-favicon",
        message: `could not fetch/decode ${favicon.url}`,
      });
    }
  }

  const candidates = collectImageCandidates(artifact);
  if (candidates.length === 0) {
    log({ level: "info", step: "logo", message: "no <img>/og:image logo candidates found" });
    return logo;
  }

  for (const candidate of candidates.slice(0, MAX_CANDIDATES_TRIED)) {
    const bytes = await fetchBytes(candidate.url);
    if (!bytes) continue;
    const asset = await bytesToLogoAsset(candidate.url, bytes);
    if (!asset) continue;

    const luminance = await computeLuminance(bytes);
    if (luminance !== null && luminance > LIGHT_LOGO_LUMINANCE_THRESHOLD) {
      logo.dark = asset;
    } else {
      logo.light = asset;
    }
    log({
      level: "info",
      step: "logo",
      message: `selected ${candidate.url} (score ${candidate.score}: ${candidate.reasons.join(", ")})`,
      meta: { luminance },
    });
    return logo;
  }

  log({
    level: "warn",
    step: "logo",
    message: `found ${candidates.length} candidate(s) but could not fetch/decode any of them`,
  });
  return logo;
}
