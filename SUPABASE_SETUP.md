# Vox Terra - Supabase Setup Guide

## Quick Start

### 1. Create Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yzxxxfwjdaieqgkdidlb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eHh4ZndqZGFpZXFna2RpZGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDUzMDEsImV4cCI6MjA4MzMyMTMwMX0.BVMoQ2W70pEdrCEY7OG7BiyhqG2Jv8i_J1qu50AGqho
```

### 2. Run Database Schema

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yzxxxfwjdaieqgkdidlb)
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Run the SQL to create tables, functions, and indexes

### 3. Initial Data Population

Run the aggregation to populate the database:

```bash
# Via API route (local dev)
curl -X POST http://localhost:3000/api/aggregate

# Or via deployed site
curl -X POST https://your-site.vercel.app/api/aggregate
```

### 4. Set Up Cron Job (Optional)

For automatic updates every 10 minutes:

**Option A: Vercel Cron**

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/aggregate",
    "schedule": "*/10 * * * *"
  }]
}
```

**Option B: Supabase Scheduled Jobs**

In Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'aggregate-news',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-site.vercel.app/api/aggregate',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `events` | Main news events with geocoding, weights, full-text search |
| `top_stories` | Pre-computed ranked stories for fast "Top 10" queries |
| `aggregation_log` | Tracks aggregation runs for monitoring |

### Key Indexes

- `idx_events_timestamp` - Fast time-based queries
- `idx_events_weight` - Fast sorting by weight
- `idx_events_lat_lng` - Geo queries
- Full-text search index on title, description, location

### Functions

| Function | Description |
|----------|-------------|
| `search_events(query, limit)` | Full-text search with ranking |
| `get_top_stories(country, category, limit)` | Get ranked top stories |
| `compute_top_stories()` | Recompute rankings |
| `cleanup_old_events(days)` | Remove old events |

---

## API Routes

### GET /api/events

Fetch events from Supabase (with RSS fallback).

```bash
# Basic fetch
GET /api/events

# With filters
GET /api/events?limit=100&category=politics&country=usa
```

### POST /api/aggregate

Trigger news aggregation (fetches from RSS, stores in Supabase).

```bash
POST /api/aggregate
```

### GET /api/search

Search events with full-text search and filters.

```bash
# Search query
GET /api/search?q=ukraine

# Top stories
GET /api/search?top=true&country=usa&limit=10

# Category filter
GET /api/search?top=true&category=sports
```

---

## Realtime Updates

The app subscribes to Supabase Realtime for live updates:

```typescript
// In useEvents hook
supabase
  .channel('events-realtime')
  .on('postgres_changes', { event: '*', table: 'events' }, handler)
  .subscribe()
```

New events automatically appear on the globe without refresh!

---

## Performance Benefits

| Metric | Before (RSS) | After (Supabase) |
|--------|--------------|------------------|
| Load time | 2-4s | <1s |
| Max events | 150 | 500+ |
| Search | Client-side | Server-side FTS |
| Updates | Manual refresh | Realtime |
| Caching | None | CDN + Supabase |

---

## Troubleshooting

### Events not loading?

1. Check `.env.local` has correct credentials
2. Verify tables exist in Supabase
3. Run aggregation: `POST /api/aggregate`
4. Check browser console for errors

### Realtime not working?

1. Ensure table has Realtime enabled:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE events;
   ```
2. Check RLS policies allow SELECT

### Search returning no results?

1. Verify events exist in database
2. Check full-text search index exists
3. Try ILIKE fallback by searching partial terms

---

## Future Enhancements

- [ ] xAI/X API integration for live tweets
- [ ] Semantic search with embeddings
- [ ] User accounts for saved searches
- [ ] Webhook triggers for breaking news
- [ ] Geographic clustering via PostGIS
