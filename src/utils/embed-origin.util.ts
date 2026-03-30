import type { IncomingHttpHeaders } from 'http';
import type { Bot } from '../common/entities/bot.entity';
import { BotType } from '../types/bot';

function headerFirst(v: IncomingHttpHeaders[string]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export function getEmbedPageUrlFromHeaders(
  headers: IncomingHttpHeaders,
): string | null {
  const origin = headerFirst(headers.origin);
  if (origin?.trim()) {
    try {
      return new URL(origin.trim()).href;
    } catch {
      /* ignore */
    }
  }

  const referer = headerFirst(headers.referer);
  if (referer?.trim()) {
    try {
      return new URL(referer.trim()).href;
    } catch {
      /* ignore */
    }
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

function botRequiresVerifiedPage(bot: Bot): boolean {
  const hasDomains = (bot.domains?.length ?? 0) > 0;
  const isProjectLike =
    bot.botType === BotType.PROJECT || bot.botType === BotType.URL_SPECIFIC;
  return hasDomains || isProjectLike;
}

export function isEmbedAllowedForBot(bot: Bot, pageUrl: string | null): boolean {
  if (!botRequiresVerifiedPage(bot)) {
    return true;
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

  if (bot.botType === BotType.PROJECT || bot.botType === BotType.URL_SPECIFIC) {
    const targets = bot.targetUrls ?? [];
    if (targets.length === 0) return false;
    return pathMatchesTargets(pathname, targets);
  }

  return true;
}
