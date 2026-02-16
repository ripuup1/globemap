-- ============================================================================
-- VOX TERRA DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM: Event Categories
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'breaking', 'politics', 'sports', 'business', 'technology',
    'entertainment', 'health', 'science', 'crime', 'armed-conflict',
    'terrorism', 'civil-unrest', 'earthquake', 'volcano', 'wildfire',
    'storm', 'tsunami', 'flood', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLE: events
-- Main table storing all news events with geocoding and weights
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category event_category NOT NULL DEFAULT 'other',
  severity INTEGER NOT NULL DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  location_name TEXT,
  country TEXT,
  continent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  source_name TEXT NOT NULL,
  source_url TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  is_ongoing BOOLEAN DEFAULT FALSE,
  start_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_weight ON events(weight_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_continent ON events(continent);
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
-- Fallback simple geo index
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_ongoing ON events(is_ongoing) WHERE is_ongoing = TRUE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location_name, ''))
);

-- ============================================================================
-- TABLE: top_stories
-- Pre-computed ranked stories for fast "Top 10" queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS top_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1),
  country_filter TEXT, -- NULL = global
  category_filter event_category, -- NULL = all categories
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, country_filter, category_filter)
);

CREATE INDEX IF NOT EXISTS idx_top_stories_rank ON top_stories(rank);
CREATE INDEX IF NOT EXISTS idx_top_stories_country ON top_stories(country_filter);
CREATE INDEX IF NOT EXISTS idx_top_stories_category ON top_stories(category_filter);

-- ============================================================================
-- TABLE: aggregation_log
-- Tracks aggregation runs for monitoring and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS aggregation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  events_fetched INTEGER DEFAULT 0,
  events_stored INTEGER DEFAULT 0,
  sources_processed JSONB DEFAULT '{}'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_agg_log_started ON aggregation_log(started_at DESC);

-- ============================================================================
-- FUNCTION: search_events
-- Full-text search with ranking
-- ============================================================================
CREATE OR REPLACE FUNCTION search_events(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS SETOF events
LANGUAGE sql
STABLE
AS $$
  SELECT e.*
  FROM events e
  WHERE 
    to_tsvector('english', coalesce(e.title, '') || ' ' || coalesce(e.description, '') || ' ' || coalesce(e.location_name, ''))
    @@ plainto_tsquery('english', search_query)
    OR e.title ILIKE '%' || search_query || '%'
    OR e.location_name ILIKE '%' || search_query || '%'
    OR e.country ILIKE '%' || search_query || '%'
  ORDER BY 
    ts_rank(
      to_tsvector('english', coalesce(e.title, '') || ' ' || coalesce(e.description, '')),
      plainto_tsquery('english', search_query)
    ) DESC,
    e.weight_score DESC,
    e.timestamp DESC
  LIMIT limit_count;
$$;

-- ============================================================================
-- FUNCTION: get_top_stories
-- Get ranked top stories with optional filters
-- ============================================================================
CREATE OR REPLACE FUNCTION get_top_stories(
  p_country TEXT DEFAULT NULL,
  p_category event_category DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS SETOF events
LANGUAGE sql
STABLE
AS $$
  SELECT e.*
  FROM events e
  INNER JOIN top_stories ts ON e.id = ts.event_id
  WHERE 
    (p_country IS NULL OR ts.country_filter = p_country OR ts.country_filter IS NULL)
    AND (p_category IS NULL OR ts.category_filter = p_category OR ts.category_filter IS NULL)
  ORDER BY ts.rank ASC
  LIMIT limit_count;
$$;

-- ============================================================================
-- FUNCTION: upsert_event
-- Insert or update an event (for aggregation)
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_event(
  p_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category event_category,
  p_severity INTEGER,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_location_name TEXT,
  p_country TEXT,
  p_continent TEXT,
  p_timestamp TIMESTAMPTZ,
  p_weight_score DOUBLE PRECISION,
  p_source_name TEXT,
  p_source_url TEXT,
  p_sources JSONB,
  p_timeline JSONB,
  p_is_ongoing BOOLEAN,
  p_start_date DATE,
  p_metadata JSONB
)
RETURNS events
LANGUAGE plpgsql
AS $$
DECLARE
  result events;
BEGIN
  INSERT INTO events (
    id, title, description, category, severity,
    latitude, longitude, location_name, country, continent,
    timestamp, weight_score, source_name, source_url,
    sources, timeline, is_ongoing, start_date, metadata
  ) VALUES (
    p_id, p_title, p_description, p_category, p_severity,
    p_latitude, p_longitude, p_location_name, p_country, p_continent,
    p_timestamp, p_weight_score, p_source_name, p_source_url,
    p_sources, p_timeline, p_is_ongoing, p_start_date, p_metadata
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    severity = EXCLUDED.severity,
    weight_score = EXCLUDED.weight_score,
    sources = EXCLUDED.sources,
    timeline = EXCLUDED.timeline,
    is_ongoing = EXCLUDED.is_ongoing,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;

-- ============================================================================
-- FUNCTION: compute_top_stories
-- Recompute top stories rankings
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_top_stories()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear existing rankings
  DELETE FROM top_stories;
  
  -- Insert global top stories
  INSERT INTO top_stories (event_id, rank, country_filter, category_filter, score)
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY weight_score DESC, timestamp DESC),
    NULL,
    NULL,
    weight_score
  FROM events
  WHERE timestamp > NOW() - INTERVAL '7 days'
  ORDER BY weight_score DESC, timestamp DESC
  LIMIT 50;
  
  -- Insert per-country top stories (USA, UK, etc.)
  INSERT INTO top_stories (event_id, rank, country_filter, category_filter, score)
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY country ORDER BY weight_score DESC, timestamp DESC),
    country,
    NULL,
    weight_score
  FROM events
  WHERE 
    timestamp > NOW() - INTERVAL '7 days'
    AND country IS NOT NULL
    AND country IN ('usa', 'uk', 'canada', 'australia', 'germany', 'france', 'china', 'india', 'brazil', 'mexico')
  ORDER BY country, weight_score DESC
  LIMIT 100;
  
  -- Insert per-category top stories
  INSERT INTO top_stories (event_id, rank, country_filter, category_filter, score)
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY weight_score DESC, timestamp DESC),
    NULL,
    category,
    weight_score
  FROM events
  WHERE timestamp > NOW() - INTERVAL '7 days'
  ORDER BY category, weight_score DESC
  LIMIT 100;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS for secure public access
-- ============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregation_log ENABLE ROW LEVEL SECURITY;

-- Public read access for events
CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT
  USING (true);

-- Public read access for top_stories
CREATE POLICY "Top stories are publicly readable"
  ON top_stories FOR SELECT
  USING (true);

-- Only authenticated/service role can insert/update
CREATE POLICY "Events insert for authenticated"
  ON events FOR INSERT
  WITH CHECK (true); -- Allow anon for now, tighten later

CREATE POLICY "Events update for authenticated"
  ON events FOR UPDATE
  USING (true); -- Allow anon for now, tighten later

-- ============================================================================
-- REALTIME
-- Enable realtime for live updates
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- ============================================================================
-- TRIGGER: Update timestamp on modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- CLEANUP: Remove old events (run periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE 
    timestamp < NOW() - (days_to_keep || ' days')::INTERVAL
    AND is_ongoing = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- INITIAL DATA: Insert sample ongoing conflicts
-- ============================================================================
INSERT INTO events (id, title, description, category, severity, latitude, longitude, location_name, country, continent, timestamp, weight_score, source_name, is_ongoing, start_date, timeline)
VALUES 
  ('ongoing-ukraine', 'Russia-Ukraine War', 'Full-scale Russian invasion of Ukraine, ongoing since February 2022.', 'armed-conflict', 10, 48.379, 31.165, 'Ukraine', 'ukraine', 'europe', NOW(), 15.0, 'Global Monitor', TRUE, '2022-02-24', '[{"date": "2022-02-24", "event": "Russia launches full-scale invasion"}, {"date": "2024-08-06", "event": "Ukraine incursion into Kursk Oblast"}]'::jsonb),
  ('ongoing-gaza', 'Israel-Gaza War', 'Major conflict following Hamas attack on October 7, 2023.', 'armed-conflict', 10, 31.354, 34.308, 'Gaza Strip', 'palestine', 'asia', NOW(), 15.0, 'Global Monitor', TRUE, '2023-10-07', '[{"date": "2023-10-07", "event": "Hamas attack on southern Israel"}, {"date": "2024-05-06", "event": "Rafah operation begins"}]'::jsonb),
  ('ongoing-sudan', 'Sudan Civil War', 'Armed conflict between SAF and RSF causing massive displacement.', 'armed-conflict', 9, 15.500, 32.560, 'Khartoum', 'sudan', 'africa', NOW(), 12.0, 'Global Monitor', TRUE, '2023-04-15', '[{"date": "2023-04-15", "event": "Fighting erupts between SAF and RSF"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  timestamp = NOW(),
  updated_at = NOW();

-- Run initial top stories computation
SELECT compute_top_stories();

COMMENT ON TABLE events IS 'Main news events table with geocoding, weights, and full-text search';
COMMENT ON TABLE top_stories IS 'Pre-computed ranked stories for fast Top 10 queries';
COMMENT ON TABLE aggregation_log IS 'Tracks news aggregation runs for monitoring';
