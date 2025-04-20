"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Copy, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function SimplifiedRegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Função para gerar senha aleatória
  const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setGeneratedPassword(null)

    if (!name || !email) {
      setError("Por favor, preencha todos os campos")
      return
    }

    setIsLoading(true)

    try {
      // Gerar senha temporária
      const tempPassword = generateTemporaryPassword()

      // Registrar usuário
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            name,
            temp_password: true,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message || "Erro ao criar conta")
        setIsLoading(false)
        return
      }

      // Se o registro for bem-sucedido, criar o perfil do usuário
      if (data.user) {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 1) // Expira em 1 dia

        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          name,
          email,
          expires_at: expiresAt.toISOString(),
        })

        if (profileError) {
          setError(profileError.message || "Erro ao criar perfil")
          setIsLoading(false)
          return
        }

        // Mostrar senha gerada
        setGeneratedPassword(tempPassword)
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Acesso Rápido 🚀</CardTitle>
        <CardDescription>Crie uma conta temporária para começar a usar o Deliberating Room</CardDescription>
      </CardHeader>

      {success && generatedPassword ? (
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-center">Conta Criada com Sucesso! 🎉</h3>
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-center">
              <p className="font-bold mb-2">Sua senha temporária (válida por 24 horas):</p>
              <div className="flex items-center justify-center gap-2 bg-gray-100 p-2 rounded-md">
                <code className="text-lg font-mono">{generatedPassword}</code>
                <Button variant="ghost" size="icon" onClick={copyPassword} title="Copiar senha">
                  {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-sm">Guarde esta senha! Você precisará dela para fazer login.</p>
            </AlertDescription>
          </Alert>
          <p className="text-center text-sm text-muted-foreground">
            Sua conta e todos os dados serão automaticamente excluídos após 24 horas.
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nome 👤</Label>
              <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email 📧</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Ao criar uma conta, você receberá uma senha temporária. Sua conta e todos os dados serão automaticamente
              excluídos após 24 horas.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Conta Temporária 🕒"}
            </Button>
            <div className="text-center text-sm">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </div>
          </CardFooter>
        </form>
      )}

      {success && (
        <CardFooter>
          <Button onClick={goToDashboard} className="w-full">
            Ir para o Dashboard
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
