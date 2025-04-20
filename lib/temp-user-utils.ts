import { createClientSupabaseClient } from "./supabase"

export interface TempUser {
  id: string
  name: string
  email?: string
  tempPassword: string
}

// Gerar senha temporária
export function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let password = ""
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Criar um usuário temporário
export async function createTempUser(name: string, email?: string): Promise<TempUser> {
  const supabase = createClientSupabaseClient()
  const tempPassword = generateTempPassword()

  try {
    // Verificar se a tabela existe e criar se necessário
    await ensureTempUsersTableExists()

    const { data, error } = await supabase
      .from("temp_users")
      .insert({
        name,
        email: email || null, // Garantir que email seja null se não fornecido
        temp_password: tempPassword,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro do Supabase ao criar usuário temporário:", error)
      throw new Error(error.message || "Não foi possível criar o usuário temporário")
    }

    if (!data) {
      throw new Error("Nenhum dado retornado ao criar usuário temporário")
    }

    const tempUser: TempUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      tempPassword: data.temp_password,
    }

    // Salvar no localStorage para acesso rápido
    saveCurrentUser(tempUser)

    return tempUser
  } catch (err) {
    console.error("Erro ao criar usuário temporário:", err)
    throw new Error(err instanceof Error ? err.message : "Não foi possível criar o usuário temporário")
  }
}

// Verificar se a tabela temp_users existe e criar se necessário
async function ensureTempUsersTableExists() {
  const supabase = createClientSupabaseClient()

  // Verificar se a tabela existe
  const { error } = await supabase.from("temp_users").select("id").limit(1)

  if (error && error.code === "PGRST116") {
    // Tabela não existe, vamos criar manualmente
    console.log("Tabela temp_users não existe, criando...")

    // Executar SQL para criar a tabela
    const { error: createError } = await supabase.rpc("create_temp_users_table")

    if (createError) {
      console.error("Erro ao criar tabela temp_users:", createError)
      throw new Error("Não foi possível criar a tabela de usuários temporários")
    }
  }
}

// Verificar login de usuário temporário
export async function loginTempUser(email: string, password: string): Promise<TempUser> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("temp_users")
      .select()
      .eq("email", email)
      .eq("temp_password", password)
      .single()

    if (error) {
      console.error("Erro ao fazer login:", error)
      throw new Error("Email ou senha incorretos")
    }

    if (!data) {
      throw new Error("Email ou senha incorretos")
    }

    const tempUser: TempUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      tempPassword: data.temp_password,
    }

    // Salvar no localStorage para acesso rápido
    saveCurrentUser(tempUser)

    return tempUser
  } catch (err) {
    console.error("Erro ao fazer login:", err)
    throw new Error(err instanceof Error ? err.message : "Email ou senha incorretos")
  }
}

// Salvar usuário atual no localStorage
export function saveCurrentUser(user: TempUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem("current_user", JSON.stringify(user))
}

// Obter usuário atual do localStorage
export function getCurrentUser(): TempUser | null {
  if (typeof window === "undefined") return null
  const userJson = localStorage.getItem("current_user")
  return userJson ? JSON.parse(userJson) : null
}

// Remover usuário atual do localStorage
export function removeCurrentUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("current_user")
}

// Verificar se o usuário está logado
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null
}

// Obter salas do usuário
export async function getUserRooms(userId: string): Promise<any[]> {
  const supabase = createClientSupabaseClient()

  try {
    // Verificar se a tabela room_participants existe
    const { error: checkError } = await supabase.from("room_participants").select("id").limit(1)

    if (checkError) {
      console.error("Erro ao verificar tabela room_participants:", checkError)
      return []
    }

    const { data, error } = await supabase
      .from("room_participants")
      .select(`
        id,
        is_leader,
        room_id,
        rooms (
          id,
          title,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar salas do usuário:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Erro ao buscar salas do usuário:", err)
    return []
  }
}
