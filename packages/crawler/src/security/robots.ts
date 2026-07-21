/**
 * A minimal robots.txt parser/matcher: supports `User-agent`, `Disallow`, and `Allow` only (no
 * `*`/`$` wildcards, no `Crawl-delay`/`Sitemap`) — the subset needed to decide "may we crawl this
 * one path". Longest-matching-prefix wins, ties go to `Allow`, matching the de facto standard
 * (Google's robots.txt spec) closely enough for this purpose.
 */
export interface RobotsRules {
  /** Lowercased user-agent token ("*" for the wildcard group) -> its directives, in file order. */
  groups: Map<string, { allow: string[]; disallow: string[] }>;
}

export function parseRobotsTxt(content: string): RobotsRules {
  const groups: RobotsRules["groups"] = new Map();
  let currentAgents: string[] = [];
  let sawDirectiveSinceLastAgent = false;

  const getGroup = (agent: string) => {
    let group = groups.get(agent);
    if (!group) {
      group = { allow: [], disallow: [] };
      groups.set(agent, group);
    }
    return group;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === "user-agent") {
      const agent = value.toLowerCase();
      if (sawDirectiveSinceLastAgent) {
        currentAgents = [agent];
        sawDirectiveSinceLastAgent = false;
      } else {
        currentAgents.push(agent);
      }
      continue;
    }

    if (field === "disallow" && value !== "") {
      for (const agent of currentAgents) getGroup(agent).disallow.push(value);
      sawDirectiveSinceLastAgent = true;
      continue;
    }

    if (field === "allow") {
      for (const agent of currentAgents) getGroup(agent).allow.push(value);
      sawDirectiveSinceLastAgent = true;
      continue;
    }
    // Crawl-delay, Sitemap, and any other field are intentionally ignored.
  }

  return { groups };
}

function longestMatch(patterns: string[], path: string): number {
  let longest = -1;
  for (const pattern of patterns) {
    if (path.startsWith(pattern) && pattern.length > longest) {
      longest = pattern.length;
    }
  }
  return longest;
}

/** Whether `userAgent` may crawl `path` per `rules`, preferring an exact UA match over `"*"`. */
export function isAllowedByRobots(rules: RobotsRules, userAgent: string, path: string): boolean {
  const group = rules.groups.get(userAgent.toLowerCase()) ?? rules.groups.get("*");
  if (!group) return true;

  const disallowLen = longestMatch(group.disallow, path);
  const allowLen = longestMatch(group.allow, path);
  return disallowLen <= allowLen;
}
