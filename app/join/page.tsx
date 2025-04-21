"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinRoomFromUrl, JoinRoomErrorType } from "@/lib/join-utils"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Footer from "@/components/footer"
import ConnectionDiagnostic from "@/components/connection-diagnostic"

export default function JoinRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [error, setError] = useState<{ type: JoinRoomErrorType; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDiagnostic, setShowDiagnostic] = useState(false)

  useEffect(() => {
    // Obter roomId da URL se disponível
    const roomIdParam = searchParams.get("roomId")
    if (roomIdParam) {
      setRoomId(roomIdParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !roomId) {
      setError({
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: "Nome e ID da sala são obrigatórios",
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Iniciando entrada na sala:", { roomId, name })

      // Use the improved join function
      const result = await joinRoomFromUrl(roomId, name)

      if ("userId" in result) {
        console.log("Entrada na sala bem-sucedida:", { userId: result.userId })
        // Navegar para a sala
        router.push(`/room/${roomId}`)
      } else {
        console.error("Erro ao entrar na sala:", result)
        setError({
          type: result.type,
          message: result.message,
        })
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error("Erro detalhado ao entrar na sala:", err)
      setError({
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: err.message || "Ocorreu um erro ao entrar na sala. Por favor, verifique o ID da sala.",
      })
      setIsLoading(false)
    }
  }

  if (showDiagnostic && roomId) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>
        <div className="container flex items-center justify-center min-h-screen py-12 relative z-10">
          <ConnectionDiagnostic roomId={roomId} onBack={() => setShowDiagnostic(false)} />
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

      <div className="container flex items-center justify-center min-h-screen py-12 relative z-10">
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
                  <AlertDescription>{error.message}</AlertDescription>
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
            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar na Sala 🚪"
                )}
              </Button>
              {roomId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiagnostic(true)}
                  className="text-xs text-muted-foreground"
                >
                  Problemas para entrar? Diagnosticar conexão
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
