import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Criar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Executar função de limpeza
    const { data, error } = await supabase.rpc("cleanup_expired_data")

    if (error) {
      console.error("Erro ao limpar dados expirados:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Dados expirados foram limpos com sucesso" })
  } catch (error: any) {
    console.error("Erro ao processar solicitação:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
