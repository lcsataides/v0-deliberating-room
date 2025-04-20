-- Adicionar campo de tópico à tabela de rodadas
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS topic TEXT;
