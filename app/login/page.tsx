"use client"

import { useState, useEffect } from "react"
import SimpleLoginForm from "@/components/auth/simple-login-form"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [useSimpleForm, setUseSimpleForm] = useState(true)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

  // Se não estiver usando o formulário simples, mostrar mensagem de fallback
  if (!useSimpleForm) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Login 🔑</CardTitle>
            <CardDescription>Entre com sua conta para acessar suas salas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center">
              Para usar o sistema de login, você precisa primeiro criar uma conta temporária.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/register")} className="w-full">
              Criar Conta Temporária
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <SimpleLoginForm />
    </div>
  )
}
