-- Reset tables if needed (uncomment if you want to purge all data)
-- DROP TABLE IF EXISTS public.votes;
-- DROP TABLE IF EXISTS public.rounds;
-- DROP TABLE IF EXISTS public.users;
-- DROP TABLE IF EXISTS public.rooms;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table with optimized structure
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  story_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  has_more_stories BOOLEAN DEFAULT TRUE,
  creator_name TEXT NOT NULL,
  max_topics INTEGER DEFAULT 10,
  current_topic_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create users table with optimized structure
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  is_observer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  device_id TEXT
);

-- Create rounds table with optimized structure
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  topic_number INTEGER NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  average FLOAT,
  mode FLOAT[],
  total_votes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  session_id TEXT
);

-- Create votes table with optimized structure
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table to track topic sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  topic_count INTEGER DEFAULT 0
);

-- Create function to automatically purge old data
CREATE OR REPLACE FUNCTION purge_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete data from rooms that have expired
  DELETE FROM public.votes 
  WHERE room_id IN (SELECT id FROM public.rooms WHERE expires_at < NOW());
  
  DELETE FROM public.rounds
  WHERE room_id IN (SELECT id FROM public.rooms WHERE expires_at < NOW());
  
  DELETE FROM public.users
  WHERE room_id IN (SELECT id FROM public.rooms WHERE expires_at < NOW());
  
  DELETE FROM public.sessions
  WHERE room_id IN (SELECT id FROM public.rooms WHERE expires_at < NOW());
  
  DELETE FROM public.rooms
  WHERE expires_at < NOW();
  
  -- Update expiration date for active rooms
  UPDATE public.rooms
  SET expires_at = NOW() + INTERVAL '7 days'
  WHERE is_active = TRUE AND (NOW() - created_at) > INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to increment topic count
CREATE OR REPLACE FUNCTION increment_topic_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooms
  SET current_topic_count = current_topic_count + 1
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment topic count when a new round is created
CREATE TRIGGER increment_room_topic_count
AFTER INSERT ON public.rounds
FOR EACH ROW
EXECUTE FUNCTION increment_topic_count();

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Allow read access to rooms" ON public.rooms
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to rooms" ON public.rooms
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to rooms" ON public.rooms
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create policies for users
CREATE POLICY "Allow read access to users" ON public.users
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to users" ON public.users
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to users" ON public.users
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create policies for rounds
CREATE POLICY "Allow read access to rounds" ON public.rounds
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to rounds" ON public.rounds
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to rounds" ON public.rounds
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create policies for votes
CREATE POLICY "Allow read access to votes" ON public.votes
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to votes" ON public.votes
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to votes" ON public.votes
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create policies for sessions
CREATE POLICY "Allow read access to sessions" ON public.sessions
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to sessions" ON public.sessions
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to sessions" ON public.sessions
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_room_id ON public.users(room_id);
CREATE INDEX IF NOT EXISTS idx_rounds_room_id ON public.rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_votes_round_id ON public.votes(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON public.sessions(room_id);
