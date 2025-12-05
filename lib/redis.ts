import { Redis } from "@upstash/redis";

// Lazy initialization to avoid build-time errors
let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

export interface SummaryRecord {
  id: string;
  videoId: string;
  userId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
  transcript: string;
  summary: string;
  createdAt: string;
  emailedTo: string;
  [key: string]: string; // Index signature for Redis compatibility
}

const TRANSCRIPT_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

// Tokenization for search index
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Save a summary record with search indexing
 */
export async function saveSummary(record: SummaryRecord): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();

  // Store the main record
  pipeline.hset(`summary:${record.id}`, record);

  // Add to user's timeline (sorted set by timestamp)
  pipeline.zadd(`user:${record.userId}:summaries`, {
    score: new Date(record.createdAt).getTime(),
    member: record.id,
  });

  // Build search index for this user
  const tokens = new Set([
    ...tokenize(record.title),
    ...tokenize(record.summary),
    ...tokenize(record.channelName),
  ]);

  for (const token of tokens) {
    pipeline.sadd(`user:${record.userId}:search:${token}`, record.id);
  }

  // Store tokens for cleanup on deletion
  pipeline.set(`summary:${record.id}:tokens`, JSON.stringify([...tokens]));

  // Cache transcript separately with TTL
  pipeline.set(`transcript:${record.videoId}`, record.transcript, {
    ex: TRANSCRIPT_CACHE_TTL,
  });

  await pipeline.exec();
}

/**
 * Get a single summary by ID
 */
export async function getSummary(id: string): Promise<SummaryRecord | null> {
  const redis = getRedis();
  const record = await redis.hgetall<SummaryRecord>(`summary:${id}`);
  return record && Object.keys(record).length > 0 ? record : null;
}

/**
 * Get cached transcript for a video
 */
export async function getCachedTranscript(videoId: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get<string>(`transcript:${videoId}`);
}

/**
 * Get paginated history for a user
 */
export async function getHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ summaries: SummaryRecord[]; total: number }> {
  const redis = getRedis();
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // Get total count
  const total = await redis.zcard(`user:${userId}:summaries`);

  // Get IDs in reverse chronological order
  const ids = await redis.zrange<string[]>(
    `user:${userId}:summaries`,
    start,
    end,
    { rev: true }
  );

  if (ids.length === 0) {
    return { summaries: [], total };
  }

  // Fetch all records
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.hgetall(`summary:${id}`);
  }

  const results = await pipeline.exec<(SummaryRecord | null)[]>();
  const summaries = results.filter((r): r is SummaryRecord => r !== null);

  return { summaries, total };
}

/**
 * Search user's summaries by title and content
 */
export async function searchHistory(
  userId: string,
  query: string
): Promise<SummaryRecord[]> {
  const redis = getRedis();
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    // Return recent entries if no search terms
    const { summaries } = await getHistory(userId, 1, 50);
    return summaries;
  }

  // Get IDs matching all tokens (intersection)
  const tokenSets = tokens.map((t) => `user:${userId}:search:${t}`);

  let matchingIds: string[];

  if (tokenSets.length === 1) {
    matchingIds = await redis.smembers<string[]>(tokenSets[0]);
  } else {
    // Use SINTER for multiple terms
    matchingIds = (await redis.sinter(...(tokenSets as [string, ...string[]]))) as string[];
  }

  if (matchingIds.length === 0) {
    return [];
  }

  // Fetch all matching records
  const pipeline = redis.pipeline();
  for (const id of matchingIds) {
    pipeline.hgetall(`summary:${id}`);
  }

  const results = await pipeline.exec<(SummaryRecord | null)[]>();
  const summaries = results.filter((r): r is SummaryRecord => r !== null);

  // Sort by date descending
  return summaries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Delete a summary and clean up indexes
 */
export async function deleteSummary(id: string, userId: string): Promise<void> {
  const redis = getRedis();
  
  // Get tokens for cleanup
  const tokensJson = await redis.get<string>(`summary:${id}:tokens`);
  const tokens: string[] = tokensJson ? JSON.parse(tokensJson) : [];

  const pipeline = redis.pipeline();

  // Remove from search indexes
  for (const token of tokens) {
    pipeline.srem(`user:${userId}:search:${token}`, id);
  }

  // Remove main record and metadata
  pipeline.del(`summary:${id}`);
  pipeline.del(`summary:${id}:tokens`);
  pipeline.zrem(`user:${userId}:summaries`, id);

  await pipeline.exec();
}

/**
 * Bulk delete summaries
 */
export async function bulkDelete(ids: string[], userId: string): Promise<void> {
  for (const id of ids) {
    await deleteSummary(id, userId);
  }
}

/**
 * Check if a video has been summarized by this user
 */
export async function getSummaryByVideoId(
  userId: string,
  videoId: string
): Promise<SummaryRecord | null> {
  const redis = getRedis();
  
  // Get all user's summary IDs
  const ids = await redis.zrange<string[]>(`user:${userId}:summaries`, 0, -1);

  // Check each one for matching videoId
  for (const id of ids) {
    const record = await redis.hgetall<SummaryRecord>(`summary:${id}`);
    if (record && record.videoId === videoId) {
      return record;
    }
  }

  return null;
}
