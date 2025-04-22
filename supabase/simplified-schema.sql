-- Reset tables if needed (uncomment if you want to purge all data)
-- DROP TABLE IF EXISTS public.votes;
-- DROP TABLE IF EXISTS public.rounds;
-- DROP TABLE IF EXISTS public.users;
-- DROP TABLE IF EXISTS public.rooms;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  story_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  has_more_stories BOOLEAN DEFAULT TRUE
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  is_observer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rounds table
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  average FLOAT,
  mode FLOAT[],
  total_votes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

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
