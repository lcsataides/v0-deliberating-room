import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Cria um cliente único do Supabase para uso no lado do servidor
const createServerSupabaseClient = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables for server client")
      throw new Error("Missing Supabase environment variables")
    }

    return createClient<Database>(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error("Error creating server Supabase client:", error)
    throw new Error("Failed to initialize Supabase server client")
  }
}

// Cria um cliente único do Supabase para uso no lado do cliente
let supabaseClientInstance: ReturnType<typeof createClient<Database>> | null = null

export const createClientSupabaseClient = () => {
  try {
    if (supabaseClientInstance) return supabaseClientInstance

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables for client")
      throw new Error("Missing Supabase environment variables")
    }

    supabaseClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
    return supabaseClientInstance
  } catch (error) {
    console.error("Error creating client Supabase client:", error)
    throw new Error("Failed to initialize Supabase client")
  }
}

export default createServerSupabaseClient
