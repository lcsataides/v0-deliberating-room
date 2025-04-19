"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateRoomId, createRoom } from "@/lib/room-utils"

export default function CreateRoom() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomTitle, setRoomTitle] = useState("")
  const [storyLink, setStoryLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !roomTitle) return

    setIsLoading(true)

    // Generate a unique room ID
    const roomId = generateRoomId()

    // Create the room with the current user as leader
    createRoom({
      id: roomId,
      title: roomTitle,
      storyLink: storyLink,
      leader: {
        id: Date.now().toString(),
        name,
        isLeader: true,
        isObserver: false,
      },
      users: [],
      currentRound: {
        isOpen: true,
        votes: {},
        result: null,
      },
      history: [],
    })

    // Navigate to the room
    router.push(`/room/${roomId}`)
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Criar uma Sala 🚀</CardTitle>
          <CardDescription>Configure uma nova sala de deliberação como líder 👑</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
