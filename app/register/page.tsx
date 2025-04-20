"use client"

import { useState, useEffect } from "react"
import SimpleRegisterForm from "@/components/auth/simple-register-form"
import FallbackRegisterForm from "@/components/auth/fallback-register-form"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function RegisterPage() {
  const [useSimpleForm, setUseSimpleForm] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkDatabase() {
      try {
        const supabase = createClientSupabaseClient()

        // Tentar acessar a tabela temp_users
        const { error } = await supabase.from("temp_users").select("id").limit(1)

        // Se houver erro, usar o formulário de fallback
        if (error) {
          console.log("Usando formulário de fallback devido a erro:", error)
          setUseSimpleForm(false)
        }
      } catch (err) {
        console.error("Erro ao verificar banco de dados:", err)
        setUseSimpleForm(false)
      } finally {
        setLoading(false)
      }
    }

    checkDatabase()
  }, [])

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      {useSimpleForm ? <SimpleRegisterForm /> : <FallbackRegisterForm />}
    </div>
  )
}
