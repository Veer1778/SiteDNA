export {
  crawlUrl,
  CrawlTimeoutError,
  RobotsDisallowedError,
  TooManyRedirectsError,
  DEFAULT_USER_AGENT,
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  DEFAULT_TOTAL_TIMEOUT_MS,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_MAX_RESPONSE_BYTES,
} from "./crawl.js";
export type { CrawlOptions } from "./crawl.js";

export * from "./schema.js";

export { readCrawlArtifactFromDir, writeCrawlArtifactToDir } from "./serialize.js";

export { SsrfError, UrlValidationError } from "./security/url-guard.js";
export type { CrawlLogEvent, CrawlLogger } from "./security/log.js";

/** Package identity, used by tooling to confirm the package builds and is importable. */
export const PACKAGE_NAME = "@brandkit/crawler" as const;
