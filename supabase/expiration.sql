-- Adicionar campo de expiração às tabelas
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Criar função para definir data de expiração padrão (1 dia)
CREATE OR REPLACE FUNCTION set_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NOW() + INTERVAL '1 day';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para definir expiração automática
CREATE TRIGGER set_room_expiration
BEFORE INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION set_expiration();

CREATE TRIGGER set_user_expiration
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION set_expiration();

CREATE TRIGGER set_round_expiration
BEFORE INSERT ON public.rounds
FOR EACH ROW
EXECUTE FUNCTION set_expiration();

CREATE TRIGGER set_vote_expiration
BEFORE INSERT ON public.votes
FOR EACH ROW
EXECUTE FUNCTION set_expiration();

CREATE TRIGGER set_profile_expiration
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_expiration();

-- Criar função para limpar dados expirados (executar como cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Excluir votos expirados
  DELETE FROM public.votes WHERE expires_at < NOW();
  
  -- Excluir rodadas expiradas
  DELETE FROM public.rounds WHERE expires_at < NOW();
  
  -- Excluir usuários expirados
  DELETE FROM public.users WHERE expires_at < NOW();
  
  -- Excluir salas expiradas
  DELETE FROM public.rooms WHERE expires_at < NOW();
  
  -- Excluir perfis expirados
  DELETE FROM public.profiles WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Configurar função para ser executada diariamente
SELECT cron.schedule(
  'cleanup-expired-data',
  '0 0 * * *',  -- Executar à meia-noite todos os dias
  $$SELECT cleanup_expired_data()$$
);
