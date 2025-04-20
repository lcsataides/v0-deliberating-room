-- Função para criar a tabela temp_users se não existir
CREATE OR REPLACE FUNCTION create_temp_users_table()
RETURNS void AS $
BEGIN
  -- Verificar se a tabela já existe
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'temp_users'
  ) THEN
    -- Criar a tabela temp_users
    CREATE TABLE public.temp_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT,
      temp_password TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
    );

    -- Habilitar RLS
    ALTER TABLE public.temp_users ENABLE ROW LEVEL SECURITY;

    -- Criar políticas de acesso
    CREATE POLICY "Allow read access to temp_users" ON public.temp_users
      FOR SELECT TO anon
      USING (TRUE);

    CREATE POLICY "Allow insert to temp_users" ON public.temp_users
      FOR INSERT TO anon
      WITH CHECK (TRUE);
      
    CREATE POLICY "Allow update to temp_users" ON public.temp_users
      FOR UPDATE TO anon
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;

  -- Verificar se a tabela room_participants já existe
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'room_participants'
  ) THEN
    -- Criar a tabela room_participants
    CREATE TABLE public.room_participants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      room_id TEXT NOT NULL,
      is_leader BOOLEAN DEFAULT FALSE,
      is_observer BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
    );

    -- Habilitar RLS
    ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

    -- Criar políticas de acesso
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
  END IF;
END;
$ LANGUAGE plpgsql;
