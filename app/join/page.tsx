"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinRoom } from "@/lib/supabase-utils"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function JoinRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Obter roomId da URL se disponível
    const roomIdParam = searchParams.get("roomId")
    if (roomIdParam) {
      setRoomId(roomIdParam)
    }

    // Preencher o nome com o nome do usuário autenticado
    if (user?.user_metadata?.name) {
      setName(user.user_metadata.name)
    }
  }, [searchParams, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !roomId) return
    setIsLoading(true)

    try {
      // Entrar na sala usando o Supabase
      await joinRoom(roomId, name, user?.id)

      // Navegar para a sala
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("Erro ao entrar na sala:", err)
      setError(err.message || "Ocorreu um erro ao entrar na sala. Por favor, verifique o ID da sala.")
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Deliberating Room 🔑</CardTitle>
          <CardDescription>Digite seu nome e o ID da sala para entrar 👥</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Seu Nome 👤</Label>
              <Input
                id="name"
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomId">ID da Sala 🔢</Label>
              <Input
                id="roomId"
                placeholder="Digite o ID da sala"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar na Sala 🚪"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
