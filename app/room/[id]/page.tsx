"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getRoom, castVote, endVoting, startNewRound, subscribeToRoom } from "@/lib/room-utils"
import type { Room, User } from "@/lib/types"
import { ExternalLink, Copy, Users, PlusCircle, AlertCircle } from "lucide-react"
import VotingCards from "@/components/voting-cards"
import UsersList from "@/components/users-list"
import RoundResults from "@/components/round-results"
import VotingHistory from "@/components/voting-history"
import NewRoundModal from "@/components/new-round-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
      const userId = localStorage.getItem(`room_${params.id}_user`)
      const creatorId = localStorage.getItem(`room_${params.id}_creator`)

      // Verificar se o usuário é o criador
      setIsCreator(userId === creatorId && creatorId !== null)

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

      // Verificar se todos votaram
      const newAllVoted =
        roomData.users.length > 0 &&
        roomData.users.filter((u) => !u.isObserver).every((u) => roomData.currentRound.votes[u.id] !== undefined) &&
        roomData.currentRound.votes[roomData.leader.id] !== undefined

      // Se todos votaram e a rodada está aberta, mostrar alerta
      if (newAllVoted && roomData.currentRound.isOpen && !allVoted) {
        setShowAllVotedAlert(true)
        // Esconder o alerta após 5 segundos
        setTimeout(() => {
          setShowAllVotedAlert(false)
        }, 5000)
      }

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

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    )
  }

  if (error || !room || !currentUser) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
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
      </div>
    )
  }

  const hasVoted = room.currentRound.votes[currentUser.id] !== undefined
  const canEndVoting = isCreator && allVoted && room.currentRound.isOpen
  const canStartNewRound = isCreator && !room.currentRound.isOpen

  return (
    <div className="container py-8 space-y-8">
      {showAllVotedAlert && (
        <Alert className="bg-green-50 border-green-200 animate-in fade-in slide-in-from-top-5 duration-300">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Todos os participantes votaram! O líder da sala pode encerrar a votação.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Deliberating Room 🏆</h1>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-xl">{room.title}</h2>
            <Badge>Sala: {room.id}</Badge>
            <Button variant="ghost" size="icon" onClick={copyRoomLink} title="Copiar link da sala">
              <Copy className="h-4 w-4" />
            </Button>
            {copied && <span className="text-sm text-muted-foreground">Copiado!</span>}
          </div>
        </div>

        {room.storyLink && (
          <Button variant="outline" size="sm" className="rounded-sm" asChild>
            <a href={room.storyLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Ver História 📖
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Votação 🗳️</CardTitle>
                <CardDescription>
                  {room.currentRound.isOpen
                    ? "Selecione um cartão para votar"
                    : "A votação está encerrada para esta rodada"}
                </CardDescription>
              </div>
              <div className="text-sm font-medium text-primary">{room.currentRound.topic}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch id="observer-mode" checked={currentUser.isObserver} onCheckedChange={handleObserverToggle} />
              <Label htmlFor="observer-mode">Modo observador 👁️ (não pode votar)</Label>
            </div>

            <VotingCards
              disabled={!room.currentRound.isOpen || currentUser.isObserver || hasVoted}
              selectedValue={room.currentRound.votes[currentUser.id]}
              onVote={handleVote}
            />

            {isCreator && (
              <div className="flex justify-end gap-4 mt-4">
                {canEndVoting && (
                  <Button className="rounded-sm" onClick={handleEndVoting}>
                    Encerrar Votação ✅
                  </Button>
                )}
                {canStartNewRound && (
                  <Button className="rounded-sm flex items-center gap-2" onClick={handleNewRound}>
                    <PlusCircle className="h-4 w-4" />
                    Nova Rodada 🔄
                  </Button>
                )}
              </div>
            )}

            {!room.currentRound.isOpen && room.currentRound.result && (
              <RoundResults result={room.currentRound.result} topic={room.currentRound.topic} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participantes 👥
                </CardTitle>
                <Badge>{room.users.length + 1}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <UsersList
                leader={room.leader}
                users={room.users}
                votes={room.currentRound.votes}
                showVotes={!room.currentRound.isOpen}
              />
            </CardContent>
          </Card>

          {room.history.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Votação 📊</CardTitle>
              </CardHeader>
              <CardContent>
                <VotingHistory history={room.history} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <NewRoundModal
        isOpen={showNewRoundModal}
        onClose={() => setShowNewRoundModal(false)}
        onConfirm={handleStartNewRound}
      />
    </div>
  )
}
