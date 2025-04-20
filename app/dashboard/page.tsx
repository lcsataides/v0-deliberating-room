"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { PlusCircle, LogOut, History, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser, getUserRooms, removeCurrentUser } from "@/lib/temp-user-utils"

interface RoomHistory {
  id: string
  title: string
  created_at: string
  is_leader: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [rooms, setRooms] = useState<RoomHistory[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar se o usuário está logado
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    // Carregar histórico de salas do usuário
    const fetchRooms = async () => {
      setLoadingRooms(true)
      try {
        // Tentar buscar salas do usuário
        const roomsData = await getUserRooms(currentUser.id)

        const formattedRooms = roomsData.map((item) => ({
          id: item.room_id,
          title: item.rooms?.title || "Sala sem título",
          created_at: item.rooms?.created_at || "",
          is_leader: item.is_leader,
        }))

        setRooms(formattedRooms)
      } catch (error) {
        console.error("Erro ao carregar histórico de salas:", error)
        // Em caso de erro, definir array vazio
        setRooms([])
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [router])

  const handleLogout = () => {
    removeCurrentUser()
    router.push("/")
  }

  if (!user) {
    return null // Redirecionando no useEffect
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard 📊</h1>
          <p className="text-muted-foreground">Bem-vindo, {user.name}!</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-700">
          Sua conta e todos os dados serão automaticamente excluídos após 24 horas.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Minhas Salas 🏠</CardTitle>
            <CardDescription>Salas que você criou ou participou recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRooms ? (
              <p>Carregando salas...</p>
            ) : rooms.length > 0 ? (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border rounded-md p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{room.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {room.is_leader ? "Criada por você" : "Participante"} •{" "}
                        {new Date(room.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/room/${room.id}`}>
                      <Button variant="outline" size="sm">
                        Entrar
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Você ainda não participou de nenhuma sala</p>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/create" className="w-full">
              <Button className="w-full flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Criar Nova Sala
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Ações Rápidas 🚀</CardTitle>
            <CardDescription>O que você gostaria de fazer hoje?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/create" className="w-full">
              <Button className="w-full justify-start" variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Criar Nova Sala
              </Button>
            </Link>
            <Link href="/join" className="w-full">
              <Button className="w-full justify-start" variant="outline">
                <History className="h-4 w-4 mr-2" />
                Entrar em uma Sala
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
