import type { IncomingHttpHeaders } from 'http';
import type { Bot } from '../common/entities/bot.entity';
import { BotType } from '../common/enums/bot.enum';
import type { EmbedPageContext } from '../types/embed';

function headerFirst(v: IncomingHttpHeaders[string]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const EMBED_PAGE_URL_HEADER = 'x-embed-page-url';

function clientPageUrlMatchesOrigin(
  headers: IncomingHttpHeaders,
  pageUrlRaw: string,
): string | null {
  try {
    const page = new URL(pageUrlRaw.trim());
    const originHdr = headerFirst(headers.origin);
    if (!originHdr?.trim()) return null;
    const originUrl = new URL(originHdr.trim());
    if (page.origin !== originUrl.origin) return null;
    return page.href;
  } catch {
    return null;
  }
}

export function getEmbedPageUrlFromHeaders(
  headers: IncomingHttpHeaders,
): string | null {
  const fromHeader = headerFirst(headers[EMBED_PAGE_URL_HEADER]);
  if (fromHeader?.trim()) {
    const ok = clientPageUrlMatchesOrigin(headers, fromHeader);
    if (ok) return ok;
  }

  const referer = headerFirst(headers.referer);
  if (referer?.trim()) {
    try {
      const r = new URL(referer.trim());
      const originHdr = headerFirst(headers.origin);
      if (originHdr?.trim()) {
        const o = new URL(originHdr.trim());
        if (r.origin === o.origin) return r.href;
      }
      return r.href;
    } catch {}
  }

  const origin = headerFirst(headers.origin);
  if (origin?.trim()) {
    try {
      return new URL(origin.trim()).href;
    } catch {}
  }

  return null;
}

function normalizeHostname(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

function hostnameAllowed(hostname: string, domains: string[]): boolean {
  const h = normalizeHostname(hostname);
  return domains.some((d) => normalizeHostname(d) === h);
}

function pathMatchesTargets(pathname: string, targetUrls: string[]): boolean {
  const path = pathname && pathname.length > 0 ? pathname : '/';
  for (const t of targetUrls) {
    const raw = t.trim();
    if (!raw) continue;
    if (raw === '/') return true;
    if (path === raw) return true;
    if (path.startsWith(`${raw}/`)) return true;
  }
  return false;
}

function pathMatchesTargetsExactly(
  pathname: string,
  targetUrls: string[],
): boolean {
  const path = pathname && pathname.length > 0 ? pathname : '/';
  for (const t of targetUrls) {
    const raw = t.trim();
    if (!raw) continue;
    if (path === raw) return true;
  }
  return false;
}

/**
 * When the widget token is for a parent GENERAL bot with active children, picks
 * the child whose domains + targetUrls (exact pathname) match the embed page.
 * Otherwise embed.service falls back to the parent bot.
 */
export function pickChildBotForEmbedContext(
  children: Bot[],
  context: EmbedPageContext,
): Bot | null {
  let host: string;
  let pathname: string;

  const domain = context.domain?.trim();
  if (domain) {
    const rawPath = context.path?.trim() || '/';
    pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    host = domain;
  } else {
    const pageUrl = context.pageUrl?.trim();
    if (!pageUrl) return null;
    try {
      const url = new URL(pageUrl);
      host = url.hostname;
      pathname = url.pathname || '/';
    } catch {
      return null;
    }
  }

  for (const bot of children) {
    if (!hostnameAllowed(host, bot.domains ?? [])) {
      continue;
    }
    if (!pathMatchesTargetsExactly(pathname, bot.targetUrls ?? [])) {
      continue;
    }
    return bot;
  }
  return null;
}

function botRequiresVerifiedPage(bot: Bot): boolean {
  const hasDomains = (bot.domains?.length ?? 0) > 0;
  return hasDomains || bot.botType !== BotType.GENERAL;
}

function isWidgetVisibilityAllowed(bot: Bot, at: Date): boolean {
  if (bot.botType === BotType.GENERAL) {
    return true;
  }
  const start = bot.visibilityStartDate;
  const end = bot.visibilityEndDate;
  const laxWhenMissingDates = bot.parentBot != null;
  if (laxWhenMissingDates) {
    if (!start || !end) return true;
  } else {
    if (!start || !end) return false;
  }
  const t = at.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function isEmbedAllowedForBot(bot: Bot, pageUrl: string | null): boolean {
  if (!botRequiresVerifiedPage(bot)) {
    return true;
  }

  if (!isWidgetVisibilityAllowed(bot, new Date())) {
    return false;
  }

  if (!pageUrl?.trim()) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return false;
  }

  const host = url.hostname;
  const pathname = url.pathname || '/';

  if (!(bot.domains?.length ?? 0)) {
    return false;
  }

  if (!hostnameAllowed(host, bot.domains)) {
    return false;
  }

  if (bot.botType !== BotType.GENERAL) {
    const targets = bot.targetUrls ?? [];
    if (targets.length === 0) return false;
    return pathMatchesTargets(pathname, targets);
  }

  return true;
}
