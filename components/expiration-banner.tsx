"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function ExpirationBanner() {
  const { user } = useAuth()
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchExpirationTime = async () => {
      if (!user) return

      try {
        const { data } = await supabase.from("profiles").select("expires_at").eq("id", user.id).single()

        if (data?.expires_at) {
          setExpiresAt(new Date(data.expires_at))
        }
      } catch (error) {
        console.error("Erro ao buscar data de expiração:", error)
      }
    }

    fetchExpirationTime()
  }, [user, supabase])

  useEffect(() => {
    if (!expiresAt) return

    const calculateTimeLeft = () => {
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Expirado")
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeLeft(`${hours}h ${minutes}m`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000) // Atualizar a cada minuto

    return () => clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt || !user?.user_metadata?.temp_password) {
    return null
  }

  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-6">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Conta Temporária</AlertTitle>
      <AlertDescription className="text-yellow-700">
        Sua conta e todos os dados serão automaticamente excluídos em {timeLeft}. Para manter seus dados, crie uma conta
        permanente.
      </AlertDescription>
    </Alert>
  )
}
