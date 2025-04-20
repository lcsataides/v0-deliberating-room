"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRoom } from "@/lib/room-utils"
import { getCurrentUser } from "@/lib/temp-user-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function CreateRoom() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomTitle, setRoomTitle] = useState("")
  const [storyLink, setStoryLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Verificar se o usuário está logado
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    // Preencher o nome com o nome do usuário
    setName(currentUser.name)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !roomTitle) return

    setIsLoading(true)
    setError("")

    try {
      // Criar a sala
      const { roomId } = await createRoom(roomTitle, storyLink, name)

      // Navegar para a sala
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("Erro ao criar sala:", err)
      setError(err.message || "Ocorreu um erro ao criar a sala. Por favor, tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
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
              {isLoading ? "Criando..." : "Criar Sala 🚀"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
