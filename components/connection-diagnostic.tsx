"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { diagnoseRoomConnection } from "@/lib/join-utils"
import { motion } from "framer-motion"

interface ConnectionDiagnosticProps {
  roomId: string
  onBack: () => void
}

export default function ConnectionDiagnostic({ roomId, onBack }: ConnectionDiagnosticProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await diagnoseRoomConnection(roomId)
      setDiagnosticResult(result)
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao executar diagnóstico")
      console.error("Diagnostic error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostic()
  }, [roomId])

  const getRecommendation = () => {
    if (!diagnosticResult) return null

    const { roomExists, localStorageWorks, supabaseWorks, userInRoom } = diagnosticResult

    if (!roomExists) {
      return "A sala não existe. Verifique o ID da sala ou crie uma nova sala."
    }

    if (!localStorageWorks) {
      return "Seu navegador não suporta ou bloqueou o armazenamento local. Verifique as configurações de privacidade do seu navegador."
    }

    if (!supabaseWorks) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou tente novamente mais tarde."
    }

    if (userInRoom) {
      return "Você já está registrado nesta sala. Tente recarregar a página ou limpar o cache do navegador."
    }

    return "Tente entrar na sala novamente. Se o problema persistir, tente usar outro navegador ou dispositivo."
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Diagnóstico de Conexão</CardTitle>
          <CardDescription>Verificando a conexão com a sala {roomId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Executando diagnóstico...</p>
            </div>
          ) : diagnosticResult ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Sala existe:</span>
                  {diagnosticResult.roomExists ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>Armazenamento local funciona:</span>
                  {diagnosticResult.localStorageWorks ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>Conexão com o servidor:</span>
                  {diagnosticResult.supabaseWorks ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>Usuário já na sala:</span>
                  {diagnosticResult.userInRoom ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </div>
              </div>

              {getRecommendation() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recomendação:</strong> {getRecommendation()}
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground mt-4">
                <p>ID da sala: {roomId}</p>
                {diagnosticResult.userId && <p>ID do usuário: {diagnosticResult.userId}</p>}
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={runDiagnostic} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Executar Novamente
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
