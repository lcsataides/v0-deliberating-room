"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"
import { PlusCircle, LogOut, History } from "lucide-react"
import ExpirationBanner from "@/components/expiration-banner"

interface RoomHistory {
  id: string
  title: string
  created_at: string
  is_leader: boolean
}

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth()
  const [rooms, setRooms] = useState<RoomHistory[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Redirecionar se não estiver autenticado
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // Carregar histórico de salas do usuário
    const fetchRooms = async () => {
      if (!user) return

      setLoadingRooms(true)

      try {
        // Buscar salas onde o usuário participou
        const { data: userData } = await supabase
          .from("users")
          .select("room_id, is_leader, rooms(id, title, created_at)")
          .eq("auth_id", user.id)
          .order("created_at", { ascending: false })

        if (userData) {
          const roomHistory: RoomHistory[] = userData.map((item) => ({
            id: item.room_id,
            title: item.rooms?.title || "Sala sem título",
            created_at: item.rooms?.created_at || "",
            is_leader: item.is_leader,
          }))

          setRooms(roomHistory)
        }
      } catch (error) {
        console.error("Erro ao carregar histórico de salas:", error)
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [user, supabase])

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return null // Redirecionando no useEffect
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard 📊</h1>
          <p className="text-muted-foreground">Bem-vindo, {user.user_metadata.name || user.email}!</p>
        </div>
        <Button variant="ghost" onClick={() => signOut()} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <ExpirationBanner />

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
