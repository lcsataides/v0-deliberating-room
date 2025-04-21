"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinRoom } from "@/lib/room-utils"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function JoinRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !roomId) {
      setError("Nome e ID da sala são obrigatórios")
      return
    }

    setIsLoading(true)

    try {
      console.log("Iniciando entrada na sala:", { roomId, name })

      // Entrar na sala
      const { userId } = await joinRoom(roomId, name)

      console.log("Entrada na sala bem-sucedida:", { userId })

      // Navegar para a sala
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("Erro detalhado ao entrar na sala:", err)
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
              {isLoading ? (
                <>
                  <span className="mr-2">Entrando...</span>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                "Entrar na Sala 🚪"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
