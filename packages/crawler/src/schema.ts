import { z } from "zod";

/**
 * One stylesheet found on the page. `href` is `null` for inline `<style>` blocks; linked
 * stylesheets have their content fetched and inlined here so downstream extraction never needs
 * a second network round-trip.
 */
export const StylesheetSchema = z.object({
  href: z.string().url().nullable(),
  content: z.string(),
});
export type Stylesheet = z.infer<typeof StylesheetSchema>;

/**
 * The subset of `getComputedStyle()` properties relevant to brand extraction (Phase 2), captured
 * for one CSS selector from {@link COMPUTED_STYLE_SELECTORS}. Not the full computed style object
 * (300+ properties) — just what typography/color extraction will read.
 */
export const ComputedStylePropertiesSchema = z.object({
  color: z.string(),
  backgroundColor: z.string(),
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.string(),
  lineHeight: z.string(),
  letterSpacing: z.string(),
  borderRadius: z.string(),
  boxShadow: z.string(),
  border: z.string(),
  borderColor: z.string(),
  padding: z.string(),
  margin: z.string(),
});
export type ComputedStyleProperties = z.infer<typeof ComputedStylePropertiesSchema>;

/** Computed style for the first element matching `selector`, or `null` if none was found. */
export const ComputedStyleEntrySchema = z.object({
  selector: z.string(),
  styles: ComputedStylePropertiesSchema.nullable(),
});
export type ComputedStyleEntry = z.infer<typeof ComputedStyleEntrySchema>;

/** The kinds of page assets the crawler distinguishes when cataloging URLs. */
export const AssetKindSchema = z.enum(["image", "font", "icon", "other"]);
export type AssetKind = z.infer<typeof AssetKindSchema>;

/** One discovered asset URL with whatever metadata was cheaply available during the crawl. */
export const AssetRefSchema = z.object({
  url: z.string().url(),
  kind: AssetKindSchema,
  /** MIME type from the response's `Content-Type` header, if the asset was fetched. */
  contentType: z.string().nullable(),
  /** Intrinsic width in pixels, for images loaded in the DOM. */
  width: z.number().positive().nullable(),
  /** Intrinsic height in pixels, for images loaded in the DOM. */
  height: z.number().positive().nullable(),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

/** One favicon/app-icon `<link>` found in the document head. */
export const FaviconCandidateSchema = z.object({
  url: z.string().url(),
  /** The `rel` attribute value, e.g. `"icon"`, `"apple-touch-icon"`, `"shortcut icon"`. */
  rel: z.string(),
  /** The `sizes` attribute value, e.g. `"32x32"`, if present. */
  sizes: z.string().nullable(),
});
export type FaviconCandidate = z.infer<typeof FaviconCandidateSchema>;

/** Page-level metadata pulled from `<title>` and `<meta name="description">`. */
export const PageMetaSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

/**
 * The normalized output of crawling a single page: everything `packages/extractor` (Phase 2)
 * needs, with no further network access. Produced by {@link crawlUrl} in `./crawl.js`.
 */
export const CrawlArtifactSchema = z.object({
  /** The URL passed in, after normalization (see `normalizeUrl` in `./security/url-guard.js`). */
  sourceUrl: z.string().url(),
  /** The URL actually rendered, after following any redirects. */
  finalUrl: z.string().url(),
  /** Every URL visited while resolving redirects, `sourceUrl` first and `finalUrl` last. */
  redirectChain: z.array(z.string().url()).min(1),
  /** ISO 8601 timestamp of when the crawl completed. */
  crawledAt: z.string().datetime(),
  /** Fully rendered HTML (`page.content()`), after JS execution. */
  html: z.string(),
  meta: PageMetaSchema,
  /** Every stylesheet in effect on the page: linked (fetched) and inline. */
  stylesheets: z.array(StylesheetSchema),
  computedStyles: z.array(ComputedStyleEntrySchema),
  /** Full-page PNG screenshot. */
  screenshotFullPage: z.instanceof(Buffer),
  /** Viewport-only PNG screenshot. */
  screenshotViewport: z.instanceof(Buffer),
  assets: z.array(AssetRefSchema),
  faviconCandidates: z.array(FaviconCandidateSchema),
});
export type CrawlArtifact = z.infer<typeof CrawlArtifactSchema>;

/**
 * CSS selectors sampled for {@link ComputedStyleEntrySchema}. Chosen to cover the elements
 * Phase 2's typography/color extractor reads from: document root, headings, body copy, links,
 * and the interactive controls most likely to carry brand color (buttons, inputs, nav).
 */
export const COMPUTED_STYLE_SELECTORS = [
  "html",
  "body",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "button",
  "input",
  "nav",
] as const;
