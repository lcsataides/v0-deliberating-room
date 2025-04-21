"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  getRoom,
  castVote,
  endVoting,
  startNewRound,
  subscribeToRoom,
  getCurrentUser,
  isRoomCreator,
  markNoMoreStories,
} from "@/lib/room-utils"
import type { Room, User } from "@/lib/types"
import { ExternalLink, Copy, Users, PlusCircle, CheckCircle2, XCircle, Flag } from "lucide-react"
import VotingCards from "@/components/voting-cards"
import UsersList from "@/components/users-list"
import RoundResults from "@/components/round-results"
import VotingHistory from "@/components/voting-history"
import NewRoundModal from "@/components/new-round-modal"
import CelebrationAnimation from "@/components/celebration-animation"
import SessionClosing from "@/components/session-closing"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewRoundModal, setShowNewRoundModal] = useState(false)
  const [allVoted, setAllVoted] = useState(false)
  const [showAllVotedAlert, setShowAllVotedAlert] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showSessionClosing, setShowSessionClosing] = useState(false)
  const prevRoundIdRef = useRef<string | undefined>(undefined)

  // Carregar dados da sala
  const fetchRoomData = async () => {
    try {
      const roomData = await getRoom(params.id)
      if (!roomData) {
        setError("Sala não encontrada")
        return
      }

      setRoom(roomData)

      // Verificar se o usuário atual está na sala
      const userId = getCurrentUser(params.id)

      // Verificar se o usuário é o criador
      const userIsCreator = userId ? isRoomCreator(params.id, userId) : false
      setIsCreator(userIsCreator)

      if (userId) {
        // Encontrar o usuário na lista
        const user =
          roomData.users.find((u) => u.id === userId) || (roomData.leader.id === userId ? roomData.leader : null)

        if (user) {
          setCurrentUser(user)
        } else {
          // Se o usuário não for encontrado, redirecionar para a página de entrada
          router.push(`/join?roomId=${params.id}`)
          return
        }
      } else {
        // Se não houver ID de usuário, redirecionar para a página de entrada
        router.push(`/join?roomId=${params.id}`)
        return
      }

      // Verificar se todos votaram (exceto observadores)
      const activeUsers = [roomData.leader, ...roomData.users].filter((u) => !u.isObserver)
      const newAllVoted =
        activeUsers.length > 0 && activeUsers.every((u) => roomData.currentRound.votes[u.id] !== undefined)

      // Se todos votaram e a rodada está aberta, mostrar alerta
      if (newAllVoted && roomData.currentRound.isOpen && !allVoted) {
        setShowAllVotedAlert(true)
        // Esconder o alerta após 5 segundos
        setTimeout(() => {
          setShowAllVotedAlert(false)
        }, 5000)
      }

      // Verificar se a rodada acabou de ser encerrada para mostrar a celebração
      if (
        prevRoundIdRef.current === roomData.currentRound.id &&
        !roomData.currentRound.isOpen &&
        roomData.currentRound.result
      ) {
        setShowCelebration(true)
      }

      // Atualizar a referência da rodada atual
      prevRoundIdRef.current = roomData.currentRound.id

      setAllVoted(newAllVoted)
      setLoading(false)
    } catch (err) {
      console.error("Erro ao carregar sala:", err)
      setError("Erro ao carregar dados da sala")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoomData()

    // Configurar escuta em tempo real
    const unsubscribe = subscribeToRoom(params.id, fetchRoomData)

    return () => {
      unsubscribe()
    }
  }, [params.id, router])

  const handleObserverToggle = async () => {
    if (!currentUser || !room) return

    try {
      // Atualizar status de observador localmente
      const newStatus = !currentUser.isObserver

      // Atualizar estado local
      setCurrentUser({
        ...currentUser,
        isObserver: newStatus,
      })

      // Atualizar no banco de dados
      await fetch(`/api/rooms/${room.id}/users/${currentUser.id}/observer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isObserver: newStatus }),
      })
    } catch (err) {
      console.error("Erro ao alterar status de observador:", err)
    }
  }

  const handleVote = async (value: number) => {
    if (!currentUser || !room || currentUser.isObserver || !room.currentRound.id) return

    try {
      await castVote(room.id, currentUser.id, room.currentRound.id, value)
    } catch (err) {
      console.error("Erro ao registrar voto:", err)
    }
  }

  const handleEndVoting = async () => {
    if (!room || !isCreator || !room.currentRound.id) return

    try {
      await endVoting(room.id, room.currentRound.id)
    } catch (err) {
      console.error("Erro ao encerrar votação:", err)
    }
  }

  const handleNewRound = () => {
    setShowNewRoundModal(true)
  }

  const handleStartNewRound = async (topic: string) => {
    if (!room || !isCreator) return

    try {
      await startNewRound(room.id, topic)
      setShowNewRoundModal(false)
    } catch (err) {
      console.error("Erro ao iniciar nova rodada:", err)
    }
  }

  const handleFinishSession = async () => {
    if (!room || !isCreator) return

    try {
      await markNoMoreStories(room.id)
      setShowSessionClosing(true)
    } catch (err) {
      console.error("Erro ao finalizar sessão:", err)
    }
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Carregando sala...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !room || !currentUser) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="text-destructive" size={20} />
                Erro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Ocorreu um erro ao carregar a sala"}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/")} className="w-full">
                Voltar para a página inicial
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (showSessionClosing) {
    return (
      <SessionClosing
        roomTitle={room.title}
        totalRounds={room.history.length + 1}
        onBack={() => setShowSessionClosing(false)}
      />
    )
  }

  const hasVoted = room.currentRound.votes[currentUser.id] !== undefined
  const canEndVoting = isCreator && allVoted && room.currentRound.isOpen
  const canStartNewRound = isCreator && !room.currentRound.isOpen

  return (
    <div className="container py-8 space-y-8">
      <CelebrationAnimation isVisible={showCelebration} onComplete={() => setShowCelebration(false)} />

      <AnimatePresence>
        {showAllVotedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Todos os participantes votaram! O líder da sala pode encerrar a votação.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-3xl font-bold">Deliberating Room 🏆</h1>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-xl">{room.title}</h2>
            <Badge className="transition-all hover:bg-primary/80">{room.id}</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyRoomLink}
              title="Copiar link da sala"
              className="transition-all hover:scale-110"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {copied && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-green-600"
              >
                Copiado!
              </motion.span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex gap-2">
            {room.storyLink && (
              <Button variant="outline" size="sm" className="rounded-sm hover:bg-primary/10" asChild>
                <a href={room.storyLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Ver História 📖
                </a>
              </Button>
            )}

            {isCreator && room.hasMoreStories && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={handleFinishSession}
              >
                <Flag className="h-4 w-4 mr-2" />
                Finalizar Sessão
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-lg overflow-hidden">
            <CardHeader className="bg-primary/5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Votação 🗳️</CardTitle>
                  <CardDescription>
                    {room.currentRound.isOpen
                      ? "Selecione um cartão para votar"
                      : "A votação está encerrada para esta rodada"}
                  </CardDescription>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full"
                >
                  {room.currentRound.topic}
                </motion.div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="observer-mode"
                  checked={currentUser.isObserver}
                  onCheckedChange={handleObserverToggle}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="observer-mode" className="cursor-pointer">
                  Modo observador 👁️ (não pode votar)
                </Label>
              </div>

              <VotingCards
                disabled={!room.currentRound.isOpen || currentUser.isObserver || hasVoted}
                selectedValue={room.currentRound.votes[currentUser.id]}
                onVote={handleVote}
              />

              {isCreator && (
                <motion.div
                  className="flex justify-end gap-4 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {canEndVoting && (
                    <Button
                      className="rounded-sm bg-green-600 hover:bg-green-700 transition-all"
                      onClick={handleEndVoting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Encerrar Votação
                    </Button>
                  )}
                  {canStartNewRound && (
                    <Button
                      className="rounded-sm flex items-center gap-2 transition-all hover:scale-105"
                      onClick={handleNewRound}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Nova Rodada 🔄
                    </Button>
                  )}
                </motion.div>
              )}

              {!room.currentRound.isOpen && room.currentRound.result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <RoundResults result={room.currentRound.result} topic={room.currentRound.topic} />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="rounded-lg overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participantes 👥
                </CardTitle>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30">{room.users.length + 1}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <UsersList
                leader={room.leader}
                users={room.users}
                votes={room.currentRound.votes}
                showVotes={!room.currentRound.isOpen}
              />
            </CardContent>
          </Card>

          {room.history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="rounded-lg overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg">Histórico de Votação 📊</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <VotingHistory history={room.history} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>

      <NewRoundModal
        isOpen={showNewRoundModal}
        onClose={() => setShowNewRoundModal(false)}
        onConfirm={handleStartNewRound}
      />
    </div>
  )
}
