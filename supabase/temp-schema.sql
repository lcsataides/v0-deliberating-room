-- Habilitar o UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de salas
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  story_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Criar tabela de usuários temporários
CREATE TABLE IF NOT EXISTS public.temp_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  temp_password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Criar tabela de participantes de sala
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.temp_users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  is_observer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Criar tabela de rodadas
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_open BOOLEAN DEFAULT TRUE,
  average FLOAT,
  mode FLOAT[],
  total_votes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Criar tabela de votos
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.temp_users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Criar função para limpar dados expirados
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Excluir votos expirados
  DELETE FROM public.votes WHERE expires_at < NOW();
  
  -- Excluir rodadas expiradas
  DELETE FROM public.rounds WHERE expires_at < NOW();
  
  -- Excluir participantes expirados
  DELETE FROM public.room_participants WHERE expires_at < NOW();
  
  -- Excluir salas expiradas
  DELETE FROM public.rooms WHERE expires_at < NOW();
  
  -- Excluir usuários expirados
  DELETE FROM public.temp_users WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Configurar políticas RLS para permitir acesso anônimo
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Políticas para salas
CREATE POLICY "Allow read access to rooms" ON public.rooms
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to rooms" ON public.rooms
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- Políticas para usuários temporários
CREATE POLICY "Allow read access to temp_users" ON public.temp_users
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to temp_users" ON public.temp_users
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- Políticas para participantes
CREATE POLICY "Allow read access to room_participants" ON public.room_participants
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "Allow insert to room_participants" ON public.room_participants
  FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Allow update to room_participants" ON public.room_participants
  FOR UPDATE TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- Políticas para rodadas
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

-- Políticas para votos
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
