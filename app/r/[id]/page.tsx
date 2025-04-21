"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { joinRoomFromUrl, JoinRoomErrorType, checkExistingRoomUser } from "@/lib/join-utils"
import { getRoom } from "@/lib/room-utils"
import Footer from "@/components/footer"
import ConnectionDiagnostic from "@/components/connection-diagnostic"
import { motion } from "framer-motion"

export default function DirectRoomEntry({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomTitle, setRoomTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<{ type: JoinRoomErrorType; message: string } | null>(null)
  const [showDiagnostic, setShowDiagnostic] = useState(false)

  useEffect(() => {
    const checkRoom = async () => {
      try {
        // Check if user is already in the room
        const existingUserId = checkExistingRoomUser(params.id)
        if (existingUserId) {
          // User is already in the room, redirect to room page
          router.push(`/room/${params.id}`)
          return
        }

        // Check if room exists and get its title
        const room = await getRoom(params.id)
        if (room) {
          setRoomTitle(room.title)
        } else {
          setError({
            type: JoinRoomErrorType.ROOM_NOT_FOUND,
            message: "Sala não encontrada. Verifique o ID da sala e tente novamente.",
          })
        }
      } catch (err: any) {
        console.error("Error checking room:", err)
        setError({
          type: JoinRoomErrorType.UNKNOWN_ERROR,
          message: err.message || "Erro ao verificar a sala. Por favor, tente novamente.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkRoom()
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) {
      setError({
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: "Por favor, digite seu nome para entrar na sala.",
      })
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const result = await joinRoomFromUrl(params.id, name)

      if ("userId" in result) {
        // Successfully joined, redirect to room page
        router.push(`/room/${params.id}`)
      } else {
        setError({
          type: result.type,
          message: result.message,
        })
        setIsJoining(false)
      }
    } catch (err: any) {
      console.error("Error joining room:", err)
      setError({
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: err.message || "Erro ao entrar na sala. Por favor, tente novamente.",
      })
      setIsJoining(false)
    }
  }

  if (showDiagnostic) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>
        <div className="container flex items-center justify-center min-h-screen py-12 relative z-10">
          <ConnectionDiagnostic roomId={params.id} onBack={() => setShowDiagnostic(false)} />
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Deliberating Room 🚪</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Verificando sala..."
                  : roomTitle
                    ? `Entrar na sala "${roomTitle}" (${params.id})`
                    : `Entrar na sala ${params.id}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Seu Nome 👤</Label>
                    <Input
                      id="name"
                      placeholder="Digite seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isJoining}>
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        Entrar na Sala
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiagnostic(true)}
                    className="w-full text-xs text-muted-foreground"
                  >
                    Problemas para entrar? Diagnosticar conexão
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
