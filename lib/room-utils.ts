import { createClientSupabaseClient } from "./supabase"
import type { User, Room, Round, RoundResult, RoundHistoryItem } from "./types"

// Função para gerar um ID de sala aleatório
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Função para salvar o usuário da sessão
export function saveSessionUser(userId: string, roomId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`room_${roomId}_user`, userId)
}

// Função para salvar o criador da sala
export function saveRoomCreator(userId: string, roomId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`room_${roomId}_creator`, userId)
}

// Função para salvar dados da sala localmente (fallback)
export function saveRoomLocally(room: Room): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`room_${room.id}`, JSON.stringify(room))
}

// Função para obter dados da sala localmente (fallback)
export function getRoomLocally(roomId: string): Room | null {
  if (typeof window === "undefined") return null
  const roomData = localStorage.getItem(`room_${roomId}`)
  return roomData ? JSON.parse(roomData) : null
}

// Função para gerar um ID único
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Função para criar uma sala
export async function createRoom(
  title: string,
  storyLink: string,
  leaderName: string,
): Promise<{ roomId: string; userId: string }> {
  try {
    // Gerar ID da sala
    const roomId = generateRoomId()
    const userId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      console.log("Criando sala no Supabase:", { roomId, title, storyLink })

      // Criar a sala
      const { error: roomError } = await supabase.from("rooms").insert({
        id: roomId,
        title,
        story_link: storyLink,
        has_more_stories: true,
      })

      if (roomError) {
        console.error("Erro ao criar sala no Supabase:", roomError)
        throw roomError
      }

      console.log("Criando usuário líder no Supabase:", { name: leaderName, roomId })

      // Criar o usuário líder
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: userId,
          name: leaderName,
          room_id: roomId,
          is_leader: true,
          is_observer: true, // Líder começa como observador por padrão
        })
        .select()
        .single()

      if (userError) {
        console.error("Erro ao criar usuário no Supabase:", userError)
        throw userError
      }

      console.log("Criando primeira rodada no Supabase:", { roomId })

      // Criar a primeira rodada
      const roundId = generateUUID()
      const { error: roundError } = await supabase.from("rounds").insert({
        id: roundId,
        room_id: roomId,
        is_open: true,
        topic: "Primeira rodada", // Tópico padrão para a primeira rodada
      })

      if (roundError) {
        console.error("Erro ao criar rodada no Supabase:", roundError)
        throw roundError
      }

      // Salvar o usuário da sessão e o criador
      saveSessionUser(userId, roomId)
      saveRoomCreator(userId, roomId)

      // Criar sala localmente como fallback
      const room: Room = {
        id: roomId,
        title,
        storyLink: storyLink || "",
        leader: {
          id: userId,
          name: leaderName,
          isLeader: true,
          isObserver: true,
        },
        users: [],
        currentRound: {
          id: roundId,
          topic: "Primeira rodada",
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
      }

      saveRoomLocally(room)

      return { roomId, userId }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, usando fallback local:", supabaseError)

      // Fallback: criar sala localmente
      const roundId = generateUUID()
      const room: Room = {
        id: roomId,
        title,
        storyLink: storyLink || "",
        leader: {
          id: userId,
          name: leaderName,
          isLeader: true,
          isObserver: true,
        },
        users: [],
        currentRound: {
          id: roundId,
          topic: "Primeira rodada",
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
      }

      saveRoomLocally(room)
      saveSessionUser(userId, roomId)
      saveRoomCreator(userId, roomId)

      return { roomId, userId }
    }
  } catch (error) {
    console.error("Erro detalhado ao criar sala:", error)
    throw new Error("Falha ao criar sala. Por favor, tente novamente.")
  }
}

// Função para entrar em uma sala
export async function joinRoom(roomId: string, name: string): Promise<{ userId: string }> {
  try {
    const userId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      // Verificar se a sala existe
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId).single()

      if (roomError) {
        console.error("Erro ao verificar sala no Supabase:", roomError)

        // Verificar se a sala existe localmente
        const localRoom = getRoomLocally(roomId)
        if (!localRoom) {
          throw new Error("Sala não encontrada")
        }

        // Adicionar usuário à sala local
        const updatedUsers = [
          ...localRoom.users,
          {
            id: userId,
            name,
            isLeader: false,
            isObserver: false,
          },
        ]

        const updatedRoom = {
          ...localRoom,
          users: updatedUsers,
        }

        saveRoomLocally(updatedRoom)
        saveSessionUser(userId, roomId)

        return { userId }
      }

      // Criar o usuário
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        name,
        room_id: roomId,
        is_leader: false,
        is_observer: false,
      })

      if (userError) {
        console.error("Erro ao criar usuário no Supabase:", userError)
        throw userError
      }

      // Salvar o usuário da sessão
      saveSessionUser(userId, roomId)

      return { userId }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, verificando fallback local:", supabaseError)

      // Verificar se a sala existe localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom) {
        throw new Error("Sala não encontrada")
      }

      // Adicionar usuário à sala local
      const updatedUsers = [
        ...localRoom.users,
        {
          id: userId,
          name,
          isLeader: false,
          isObserver: false,
        },
      ]

      const updatedRoom = {
        ...localRoom,
        users: updatedUsers,
      }

      saveRoomLocally(updatedRoom)
      saveSessionUser(userId, roomId)

      return { userId }
    }
  } catch (error) {
    console.error("Erro detalhado ao entrar na sala:", error)
    throw new Error("Falha ao entrar na sala. Por favor, tente novamente.")
  }
}

// Função para obter os dados de uma sala
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Obter dados da sala
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId).single()

      if (roomError) {
        console.error("Erro ao obter sala do Supabase:", roomError)
        throw roomError
      }

      // Obter usuários da sala
      const { data: usersData, error: usersError } = await supabase.from("users").select().eq("room_id", roomId)

      if (usersError) {
        console.error("Erro ao obter usuários do Supabase:", usersError)
        throw usersError
      }

      if (!usersData || usersData.length === 0) {
        throw new Error("Nenhum usuário encontrado na sala")
      }

      // Encontrar o líder
      const leaderData = usersData.find((user) => user.is_leader)

      if (!leaderData) {
        throw new Error("Líder não encontrado na sala")
      }

      // Obter a rodada atual
      const { data: roundsData, error: roundsError } = await supabase
        .from("rounds")
        .select()
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (roundsError) {
        console.error("Erro ao obter rodada do Supabase:", roundsError)
        throw roundsError
      }

      // Obter votos da rodada atual
      const { data: votesData, error: votesError } = await supabase.from("votes").select().eq("round_id", roundsData.id)

      if (votesError) {
        console.error("Erro ao obter votos do Supabase:", votesError)
        throw votesError
      }

      // Converter votos para o formato esperado
      const votes: Record<string, number> = {}
      votesData?.forEach((vote) => {
        votes[vote.user_id] = vote.value
      })

      // Obter rodadas anteriores para o histórico
      const { data: historyRoundsData, error: historyError } = await supabase
        .from("rounds")
        .select()
        .eq("room_id", roomId)
        .eq("is_open", false)
        .order("created_at", { ascending: false })

      if (historyError) {
        console.error("Erro ao obter histórico do Supabase:", historyError)
        throw historyError
      }

      // Converter rodadas anteriores para o formato esperado
      const history: RoundHistoryItem[] = []

      if (historyRoundsData && historyRoundsData.length > 0) {
        for (const historyRound of historyRoundsData) {
          // Obter votos da rodada histórica
          const { data: historyVotesData, error: historyVotesError } = await supabase
            .from("votes")
            .select()
            .eq("round_id", historyRound.id)

          if (historyVotesError) {
            console.error("Erro ao obter votos históricos do Supabase:", historyVotesError)
            continue
          }

          // Converter votos para o formato esperado
          const historyVotes: Record<string, number> = {}
          historyVotesData?.forEach((vote) => {
            historyVotes[vote.user_id] = vote.value
          })

          history.push({
            id: historyRound.id,
            topic: historyRound.topic || "Rodada sem tópico",
            votes: historyVotes,
            result: {
              average: historyRound.average || 0,
              mode: historyRound.mode || [],
              totalVotes: historyRound.total_votes || 0,
            },
            timestamp: new Date(historyRound.created_at).getTime(),
          })
        }
      }

      // Converter para o formato esperado
      const leader: User = {
        id: leaderData.id,
        name: leaderData.name,
        isLeader: true,
        isObserver: leaderData.is_observer,
      }

      const users: User[] = usersData
        .filter((user) => !user.is_leader)
        .map((user) => ({
          id: user.id,
          name: user.name,
          isLeader: false,
          isObserver: user.is_observer,
        }))

      const currentRound: Round = {
        id: roundsData.id,
        topic: roundsData.topic || "Rodada sem tópico",
        isOpen: roundsData.is_open,
        votes,
        result: roundsData.is_open
          ? null
          : {
              average: roundsData.average || 0,
              mode: roundsData.mode || [],
              totalVotes: roundsData.total_votes || 0,
            },
      }

      const room: Room = {
        id: roomId,
        title: roomData.title,
        storyLink: roomData.story_link || "",
        leader,
        users,
        currentRound,
        history,
        hasMoreStories: roomData.has_more_stories || true,
      }

      // Atualizar a sala local como fallback
      saveRoomLocally(room)

      return room
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, usando fallback local:", supabaseError)

      // Fallback: obter sala localmente
      const localRoom = getRoomLocally(roomId)
      return localRoom
    }
  } catch (error) {
    console.error("Erro detalhado ao obter sala:", error)
    throw new Error("Falha ao obter dados da sala. Por favor, tente novamente.")
  }
}

// Função para obter o usuário atual
export function getCurrentUser(roomId: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(`room_${roomId}_user`)
}

// Função para verificar se o usuário é o criador da sala
export function isRoomCreator(roomId: string, userId: string): boolean {
  if (typeof window === "undefined") return false
  const creatorId = localStorage.getItem(`room_${roomId}_creator`)
  return userId === creatorId
}

// Função para definir o status de observador do usuário
export async function setUserObserverStatus(roomId: string, userId: string, isObserver: boolean): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("users")
        .update({ is_observer: isObserver })
        .eq("id", userId)
        .eq("room_id", roomId)

      if (error) {
        console.error("Erro ao atualizar status de observador no Supabase:", error)
        throw error
      }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: atualizar localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom) return

      if (localRoom.leader.id === userId) {
        localRoom.leader.isObserver = isObserver
      } else {
        const userIndex = localRoom.users.findIndex((u) => u.id === userId)
        if (userIndex >= 0) {
          localRoom.users[userIndex].isObserver = isObserver
        }
      }

      saveRoomLocally(localRoom)
    }
  } catch (error) {
    console.error("Erro detalhado ao atualizar status de observador:", error)
    throw new Error("Falha ao atualizar status de observador. Por favor, tente novamente.")
  }
}

// Função para registrar um voto
export async function castVote(roomId: string, userId: string, roundId: string, value: number): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Verificar se já existe um voto deste usuário nesta rodada
      const { data: existingVote, error: checkError } = await supabase
        .from("votes")
        .select()
        .eq("user_id", userId)
        .eq("round_id", roundId)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Erro ao verificar voto existente no Supabase:", checkError)
        throw checkError
      }

      if (existingVote) {
        // Atualizar o voto existente
        const { error: updateError } = await supabase.from("votes").update({ value }).eq("id", existingVote.id)
        if (updateError) {
          console.error("Erro ao atualizar voto no Supabase:", updateError)
          throw updateError
        }
      } else {
        // Criar um novo voto
        const { error: insertError } = await supabase.from("votes").insert({
          id: generateUUID(),
          user_id: userId,
          room_id: roomId,
          round_id: roundId,
          value,
        })
        if (insertError) {
          console.error("Erro ao inserir voto no Supabase:", insertError)
          throw insertError
        }
      }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: registrar voto localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom) return

      if (localRoom.currentRound.id === roundId) {
        localRoom.currentRound.votes[userId] = value
        saveRoomLocally(localRoom)
      }
    }
  } catch (error) {
    console.error("Erro detalhado ao registrar voto:", error)
    throw new Error("Falha ao registrar voto. Por favor, tente novamente.")
  }
}

// Função para calcular os resultados de uma rodada
function calculateResults(votes: number[]): RoundResult {
  if (votes.length === 0) {
    return {
      average: 0,
      mode: [],
      totalVotes: 0,
    }
  }

  // Calcular média
  const sum = votes.reduce((acc, val) => acc + val, 0)
  const average = sum / votes.length

  // Calcular moda (valor mais comum)
  const counts: Record<number, number> = {}
  votes.forEach((val) => {
    counts[val] = (counts[val] || 0) + 1
  })

  let maxCount = 0
  let modes: number[] = []

  Object.entries(counts).forEach(([value, count]) => {
    const numValue = Number(value)
    if (count > maxCount) {
      maxCount = count
      modes = [numValue]
    } else if (count === maxCount) {
      modes.push(numValue)
    }
  })

  return {
    average,
    mode: modes,
    totalVotes: votes.length,
  }
}

// Função para encerrar a votação da rodada atual
export async function endVoting(roomId: string, roundId: string): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Obter todos os votos da rodada
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("value")
        .eq("round_id", roundId)

      if (votesError) {
        console.error("Erro ao obter votos do Supabase:", votesError)
        throw votesError
      }

      if (!votesData || votesData.length === 0) {
        throw new Error("Não há votos para encerrar a rodada")
      }

      // Calcular resultados
      const voteValues = votesData.map((vote) => vote.value)
      const result = calculateResults(voteValues)

      // Atualizar a rodada
      const { error: updateError } = await supabase
        .from("rounds")
        .update({
          is_open: false,
          average: result.average,
          mode: result.mode,
          total_votes: result.totalVotes,
          closed_at: new Date().toISOString(),
        })
        .eq("id", roundId)

      if (updateError) {
        console.error("Erro ao atualizar rodada no Supabase:", updateError)
        throw updateError
      }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: encerrar votação localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom || localRoom.currentRound.id !== roundId) return

      // Calcular resultados
      const votes = Object.values(localRoom.currentRound.votes)
      if (votes.length === 0) {
        throw new Error("Não há votos para encerrar a rodada")
      }

      const result = calculateResults(votes)

      // Atualizar a rodada
      localRoom.currentRound.isOpen = false
      localRoom.currentRound.result = result

      // Adicionar ao histórico
      localRoom.history.unshift({
        id: roundId,
        topic: localRoom.currentRound.topic,
        votes: { ...localRoom.currentRound.votes },
        result,
        timestamp: Date.now(),
      })

      saveRoomLocally(localRoom)
    }
  } catch (error) {
    console.error("Erro detalhado ao encerrar votação:", error)
    throw new Error("Falha ao encerrar votação. Por favor, tente novamente.")
  }
}

// Função para iniciar uma nova rodada
export async function startNewRound(roomId: string, topic: string): Promise<string> {
  try {
    const roundId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      // Criar nova rodada
      const { error } = await supabase.from("rounds").insert({
        id: roundId,
        room_id: roomId,
        is_open: true,
        topic: topic || `Rodada ${new Date().toLocaleString()}`,
      })

      if (error) {
        console.error("Erro ao criar nova rodada no Supabase:", error)
        throw error
      }

      return roundId
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: criar nova rodada localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom) throw new Error("Sala não encontrada")

      // Criar nova rodada
      const newRound: Round = {
        id: roundId,
        topic: topic || `Rodada ${new Date().toLocaleString()}`,
        isOpen: true,
        votes: {},
        result: null,
      }

      // Atualizar a sala
      localRoom.currentRound = newRound
      saveRoomLocally(localRoom)

      return roundId
    }
  } catch (error) {
    console.error("Erro detalhado ao iniciar nova rodada:", error)
    throw new Error("Falha ao iniciar nova rodada. Por favor, tente novamente.")
  }
}

// Função para marcar que não há mais histórias
export async function markNoMoreStories(roomId: string): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("rooms").update({ has_more_stories: false }).eq("id", roomId)

      if (error) {
        console.error("Erro ao marcar fim das histórias no Supabase:", error)
        throw error
      }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: atualizar localmente
      const localRoom = getRoomLocally(roomId)
      if (!localRoom) return

      localRoom.hasMoreStories = false
      saveRoomLocally(localRoom)
    }
  } catch (error) {
    console.error("Erro detalhado ao marcar fim das histórias:", error)
    throw new Error("Falha ao atualizar status de histórias. Por favor, tente novamente.")
  }
}

// Função para configurar a escuta de mudanças em tempo real
export function subscribeToRoom(roomId: string, callback: () => void) {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Inscrever-se em mudanças na sala
      const roomSubscription = supabase
        .channel(`room:${roomId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, callback)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users", filter: `room_id=eq.${roomId}` },
          callback,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
          callback,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` },
          callback,
        )
        .subscribe()

      return () => {
        supabase.removeChannel(roomSubscription)
      }
    } catch (supabaseError) {
      console.error("Erro ao configurar escuta em tempo real:", supabaseError)

      // Fallback: configurar polling local
      const intervalId = setInterval(callback, 5000)
      return () => clearInterval(intervalId)
    }
  } catch (error) {
    console.error("Erro detalhado ao configurar escuta em tempo real:", error)
    // Return a no-op cleanup function
    return () => {}
  }
}

// API para atualizar o status de observador
export async function updateObserverStatus(req: Request, roomId: string, userId: string): Promise<Response> {
  try {
    const { isObserver } = await req.json()

    await setUserObserverStatus(roomId, userId, isObserver)

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Erro na API de status de observador:", error)
    return new Response(JSON.stringify({ error: "Failed to update observer status" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
}
