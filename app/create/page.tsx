"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRoom } from "@/lib/room-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Footer from "@/components/footer"

export default function CreateRoom() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomTitle, setRoomTitle] = useState("")
  const [storyLink, setStoryLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !roomTitle) {
      setError("Nome e título da sala são obrigatórios")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Iniciando criação da sala...")

      // Criar a sala
      const { roomId, userId } = await createRoom(roomTitle, storyLink, name)

      console.log("Sala criada com sucesso:", { roomId, userId })

      // Navegar para a sala
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("Erro detalhado ao criar sala:", err)
      setError(err.message || "Ocorreu um erro ao criar a sala. Por favor, tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

      <div className="container flex items-center justify-center min-h-screen py-12 relative z-10">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Deliberating Room 🚀</CardTitle>
            <CardDescription>Configure uma nova sala de deliberação como líder 👑</CardDescription>
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
                <Label htmlFor="roomTitle">Título da Sala 📝</Label>
                <Input
                  id="roomTitle"
                  placeholder="Digite o título da sala"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storyLink">Link da História (Opcional) 🔗</Label>
                <Input
                  id="storyLink"
                  placeholder="Digite o link para a história"
                  value={storyLink}
                  onChange={(e) => setStoryLink(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">Criando...</span>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  "Criar Sala 🚀"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
