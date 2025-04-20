"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { loginTempUser } from "@/lib/temp-user-utils"

export default function SimpleLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await loginTempUser(email, password)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Erro ao fazer login:", err)
      setError(typeof err === "string" ? err : err.message || "Email ou senha incorretos")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Login 🔑</CardTitle>
        <CardDescription>Entre com sua conta para acessar suas salas</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription>Use o email e a senha temporária que você recebeu ao criar sua conta.</AlertDescription>
          </Alert>

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
          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária 🔒</Label>
            <Input
              id="password"
              type="password"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar 🚪"}
          </Button>
          <div className="text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Crie uma conta temporária
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
