import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Cria um cliente único do Supabase para uso no lado do servidor
const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, supabaseKey)
}

// Cria um cliente único do Supabase para uso no lado do cliente
let supabaseClientInstance: ReturnType<typeof createClient<Database>> | null = null

export const createClientSupabaseClient = () => {
  if (supabaseClientInstance) return supabaseClientInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  supabaseClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
  return supabaseClientInstance
}

export default createServerSupabaseClient
