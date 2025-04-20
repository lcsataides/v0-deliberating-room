"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getRoom, joinRoom } from "@/lib/room-utils"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function JoinRoom() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !roomId) return
    setIsLoading(true)

    // Check if room exists
    const room = getRoom(roomId)
    if (!room) {
      setError("Sala não encontrada. Por favor, verifique o ID da sala.")
      setIsLoading(false)
      return
    }

    // Join the room
    const userId = Date.now().toString()
    joinRoom(roomId, {
      id: userId,
      name,
      isLeader: false,
      isObserver: false,
    })

    // Navigate to the room
    router.push(`/room/${roomId}`)
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
