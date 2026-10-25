import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGY_HOME = process.env.AGY_HOME || '/home/bombi';
const AGY_BRAIN_DIR = path.join(AGY_HOME, '.gemini/antigravity-cli/brain');
const USAGE_CONFIG_PATH = path.join(__dirname, '../data/usage_config.json');

// Default quotas (can be adjusted via POST /api/usage/config or UI modal)
const DEFAULT_CONFIG = {
  limit5h: 10000000,        // 10.0M tokens default 5h limit
  limitWeekly: 50000000,    // 50.0M tokens default weekly limit
  countCache: false,        // If false, counts input + output tokens (standard prompt tokens)
  mode: 'tokens'            // 'tokens' or 'requests'
};

let cachedStats = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

/**
 * Loads usage configuration from disk or returns defaults
 */
export function getUsageConfig() {
  try {
    if (fs.existsSync(USAGE_CONFIG_PATH)) {
      const raw = fs.readFileSync(USAGE_CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[UsageService] Could not read usage_config.json:', err.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Saves usage configuration to disk
 */
export function saveUsageConfig(newConfig) {
  try {
    const current = getUsageConfig();
    const updated = {
      ...current,
      ...newConfig,
      limit5h: Math.max(1000, Number(newConfig.limit5h) || current.limit5h),
      limitWeekly: Math.max(1000, Number(newConfig.limitWeekly) || current.limitWeekly),
      countCache: typeof newConfig.countCache === 'boolean' ? newConfig.countCache : current.countCache
    };
    fs.writeFileSync(USAGE_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    // Invalidate cache on config change
    cachedStats = null;
    lastCacheTime = 0;
    return updated;
  } catch (err) {
    console.error('[UsageService] Failed to save usage config:', err.message);
    throw err;
  }
}

/**
 * Formats token counts nicely (e.g. 264.6k, 1.25M)
 */
export function formatTokens(num) {
  const n = Number(num) || 0;
  if (n >= 1000000) {
    return (n / 1000000).toFixed(2) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'k';
  }
  return n.toLocaleString();
}

/**
 * Formats seconds into human-readable duration (e.g. "2h 45m" or "4d 12h")
 */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Scans recent Antigravity transcripts and aggregates token consumption
 */
export async function calculateUsage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedStats && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedStats;
  }

  const config = getUsageConfig();
  const fiveHoursAgo = now - 5 * 3600 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  const stats5h = {
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    turns: 0,
    oldestTimestamp: null
  };

  const statsWeekly = {
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    turns: 0
  };

  try {
    if (fs.existsSync(AGY_BRAIN_DIR)) {
      const entries = fs.readdirSync(AGY_BRAIN_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const transcriptFile = path.join(AGY_BRAIN_DIR, entry.name, '.system_generated/logs/transcript.jsonl');

        try {
          if (!fs.existsSync(transcriptFile)) continue;
          const stat = fs.statSync(transcriptFile);
          // Skip transcripts not modified in the last 8 days
          if (stat.mtimeMs < sevenDaysAgo - 24 * 3600 * 1000) continue;

          const content = fs.readFileSync(transcriptFile, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines) {
            if (!line || !line.includes('tokens')) continue;
            try {
              const data = JSON.parse(line);
              const it = Number(data.input_tokens) || 0;
              const ot = Number(data.output_tokens) || 0;
              const ct = Number(data.cache_read_tokens) || 0;
              const sum = it + ot + ct;

              if (sum > 0 && data.created_at) {
                const itemTime = new Date(data.created_at).getTime();

                if (itemTime >= sevenDaysAgo && itemTime <= now) {
                  statsWeekly.inputTokens += it;
                  statsWeekly.outputTokens += ot;
                  statsWeekly.cacheTokens += ct;
                  statsWeekly.totalTokens += sum;
                  statsWeekly.turns += 1;
                }

                if (itemTime >= fiveHoursAgo && itemTime <= now) {
                  stats5h.inputTokens += it;
                  stats5h.outputTokens += ot;
                  stats5h.cacheTokens += ct;
                  stats5h.totalTokens += sum;
                  stats5h.turns += 1;

                  if (!stats5h.oldestTimestamp || itemTime < stats5h.oldestTimestamp) {
                    stats5h.oldestTimestamp = itemTime;
                  }
                }
              }
            } catch {
              // Ignore malformed line
            }
          }
        } catch {
          // Ignore read error for single conversation
        }
      }
    }
  } catch (err) {
    console.warn('[UsageService] Error scanning transcripts:', err.message);
  }

  // Determine effective tokens based on whether cache tokens are counted
  const effectiveUsed5h = config.countCache
    ? stats5h.totalTokens
    : stats5h.inputTokens + stats5h.outputTokens;

  const effectiveUsedWeekly = config.countCache
    ? statsWeekly.totalTokens
    : statsWeekly.inputTokens + statsWeekly.outputTokens;

  // Percentage calculations
  const limit5h = config.limit5h;
  const limitWeekly = config.limitWeekly;

  const used5hPercent = Math.min(100, Math.max(0, (effectiveUsed5h / limit5h) * 100));
  const remaining5hPercent = Math.max(0, 100 - used5hPercent);
  const remaining5hTokens = Math.max(0, limit5h - effectiveUsed5h);

  const usedWeeklyPercent = Math.min(100, Math.max(0, (effectiveUsedWeekly / limitWeekly) * 100));
  const remainingWeeklyPercent = Math.max(0, 100 - usedWeeklyPercent);
  const remainingWeeklyTokens = Math.max(0, limitWeekly - effectiveUsedWeekly);

  // 5-hour rolling window reset time
  // If we have turns in the 5h window, the oldest turn drops off at (oldestTimestamp + 5h)
  let resetsInSeconds5h = 5 * 3600;
  let resetsAt5h = new Date(now + 5 * 3600 * 1000).toISOString();

  if (stats5h.oldestTimestamp) {
    const expireTime = stats5h.oldestTimestamp + 5 * 3600 * 1000;
    resetsInSeconds5h = Math.max(0, Math.floor((expireTime - now) / 1000));
    resetsAt5h = new Date(expireTime).toISOString();
  }

  // Weekly reset time: upcoming Sunday at 23:59:59 UTC
  const nextSunday = new Date(now);
  const day = nextSunday.getUTCDay(); // 0 is Sunday
  const daysUntilSunday = (7 - day) % 7;
  nextSunday.setUTCDate(nextSunday.getUTCDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  nextSunday.setUTCHours(23, 59, 59, 999);
  const resetsInSecondsWeekly = Math.max(0, Math.floor((nextSunday.getTime() - now) / 1000));
  const resetsAtWeekly = nextSunday.toISOString();

  // SVG circular progress calculation
  // Radius = 8.5 -> Circumference = 2 * PI * 8.5 = 53.40707511102649
  const circumference = 53.40707511102649;
  const dashLength5h = ((used5hPercent / 100) * circumference).toFixed(4);
  const dashLengthWeekly = ((usedWeeklyPercent / 100) * circumference).toFixed(4);

  const result = {
    timestamp: new Date(now).toISOString(),
    config,
    window5h: {
      usedTokens: effectiveUsed5h,
      limitTokens: limit5h,
      remainingTokens: remaining5hTokens,
      usedPercent: parseFloat(used5hPercent.toFixed(1)),
      remainingPercent: parseFloat(remaining5hPercent.toFixed(1)),
      formattedUsed: formatTokens(effectiveUsed5h),
      formattedLimit: formatTokens(limit5h),
      formattedRemaining: formatTokens(remaining5hTokens),
      resetsInSeconds: resetsInSeconds5h,
      resetsInFormatted: formatDuration(resetsInSeconds5h),
      resetsAt: resetsAt5h,
      turns: stats5h.turns,
      dashLength: dashLength5h,
      circumference,
      breakdown: {
        input: stats5h.inputTokens,
        output: stats5h.outputTokens,
        cache: stats5h.cacheTokens,
        total: stats5h.totalTokens
      }
    },
    weekly: {
      usedTokens: effectiveUsedWeekly,
      limitTokens: limitWeekly,
      remainingTokens: remainingWeeklyTokens,
      usedPercent: parseFloat(usedWeeklyPercent.toFixed(1)),
      remainingPercent: parseFloat(remainingWeeklyPercent.toFixed(1)),
      formattedUsed: formatTokens(effectiveUsedWeekly),
      formattedLimit: formatTokens(limitWeekly),
      formattedRemaining: formatTokens(remainingWeeklyTokens),
      resetsInSeconds: resetsInSecondsWeekly,
      resetsInFormatted: formatDuration(resetsInSecondsWeekly),
      resetsAt: resetsAtWeekly,
      turns: statsWeekly.turns,
      dashLength: dashLengthWeekly,
      circumference,
      breakdown: {
        input: statsWeekly.inputTokens,
        output: statsWeekly.outputTokens,
        cache: statsWeekly.cacheTokens,
        total: statsWeekly.totalTokens
      }
    }
  };

  cachedStats = result;
  lastCacheTime = now;
  return result;
}

/**
 * Resets the in-memory cache to force a fresh scan on next request
 */
export function invalidateUsageCache() {
  cachedStats = null;
  lastCacheTime = 0;
}
