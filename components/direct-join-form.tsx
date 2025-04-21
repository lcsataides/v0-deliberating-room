"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { joinRoomFromUrl, JoinRoomErrorType } from "@/lib/join-utils"
import { motion } from "framer-motion"

interface DirectJoinFormProps {
  roomId: string
  onSuccess: (userId: string) => void
  onDiagnose: () => void
}

export default function DirectJoinForm({ roomId, onSuccess, onDiagnose }: DirectJoinFormProps) {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ type: JoinRoomErrorType; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      setError({
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: "Por favor, digite seu nome para entrar na sala.",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await joinRoomFromUrl(roomId, name)

    if ("userId" in result) {
      onSuccess(result.userId)
    } else {
      setError({
        type: result.type,
        message: result.message,
      })
      setIsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Entrar na Sala</CardTitle>
          <CardDescription>Digite seu nome para entrar na sala {roomId}</CardDescription>
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
              <Label htmlFor="name">Seu Nome</Label>
              <Input
                id="name"
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar na Sala"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiagnose}
              className="text-xs text-muted-foreground"
            >
              Problemas para entrar? Diagnosticar conexão
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}
