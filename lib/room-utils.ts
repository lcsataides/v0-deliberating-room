import { createClientSupabaseClient } from "./supabase"
import { getCurrentUser } from "./temp-user-utils"
import type { Room, User, RoundResult, RoundHistoryItem } from "./types"

// Gerar ID de sala aleatório
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Criar uma nova sala
export async function createRoom(title: string, storyLink: string, creatorName: string): Promise<{ roomId: string }> {
  const supabase = createClientSupabaseClient()
  const currentUser = getCurrentUser()

  if (!currentUser) {
    throw new Error("Usuário não está logado")
  }

  const roomId = generateRoomId()

  // Criar a sala
  await supabase.from("rooms").insert({
    id: roomId,
    title,
    story_link: storyLink,
  })

  // Adicionar o criador como líder da sala
  await supabase.from("room_participants").insert({
    user_id: currentUser.id,
    room_id: roomId,
    is_leader: true,
  })

  // Criar a primeira rodada
  await supabase.from("rounds").insert({
    room_id: roomId,
    is_open: true,
  })

  return { roomId }
}

// Entrar em uma sala existente
export async function joinRoom(roomId: string, userName: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const currentUser = getCurrentUser()

  if (!currentUser) {
    throw new Error("Usuário não está logado")
  }

  // Verificar se a sala existe
  const { data: roomData } = await supabase.from("rooms").select().eq("id", roomId).single()

  if (!roomData) {
    throw new Error("Sala não encontrada")
  }

  // Verificar se o usuário já está na sala
  const { data: existingParticipant } = await supabase
    .from("room_participants")
    .select()
    .eq("user_id", currentUser.id)
    .eq("room_id", roomId)
    .single()

  if (!existingParticipant) {
    // Adicionar o usuário à sala
    await supabase.from("room_participants").insert({
      user_id: currentUser.id,
      room_id: roomId,
      is_leader: false,
    })
  }
}

// Obter dados de uma sala
export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = createClientSupabaseClient()

  // Obter dados da sala
  const { data: roomData } = await supabase.from("rooms").select().eq("id", roomId).single()

  if (!roomData) {
    return null
  }

  // Obter participantes da sala
  const { data: participantsData } = await supabase
    .from("room_participants")
    .select(`
      id,
      user_id,
      is_leader,
      is_observer,
      temp_users (
        id,
        name
      )
    `)
    .eq("room_id", roomId)

  if (!participantsData || participantsData.length === 0) {
    return null
  }

  // Encontrar o líder
  const leaderData = participantsData.find((p) => p.is_leader)

  if (!leaderData) {
    return null
  }

  // Obter a rodada atual
  const { data: roundsData } = await supabase
    .from("rounds")
    .select()
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!roundsData) {
    return null
  }

  // Obter votos da rodada atual
  const { data: votesData } = await supabase.from("votes").select().eq("round_id", roundsData.id)

  // Converter votos para o formato esperado
  const votes: Record<string, number> = {}
  votesData?.forEach((vote) => {
    votes[vote.user_id] = vote.value
  })

  // Obter rodadas anteriores para o histórico
  const { data: historyRoundsData } = await supabase
    .from("rounds")
    .select()
    .eq("room_id", roomId)
    .eq("is_open", false)
    .order("created_at", { ascending: false })

  // Converter rodadas anteriores para o formato esperado
  const history: RoundHistoryItem[] = []

  if (historyRoundsData && historyRoundsData.length > 0) {
    for (const historyRound of historyRoundsData) {
      // Obter votos da rodada histórica
      const { data: historyVotesData } = await supabase.from("votes").select().eq("round_id", historyRound.id)

      // Converter votos para o formato esperado
      const historyVotes: Record<string, number> = {}
      historyVotesData?.forEach((vote) => {
        historyVotes[vote.user_id] = vote.value
      })

      history.push({
        id: historyRound.id,
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
    id: leaderData.user_id,
    name: leaderData.temp_users.name,
    isLeader: true,
    isObserver: leaderData.is_observer,
  }

  const users: User[] = participantsData
    .filter((p) => !p.is_leader)
    .map((p) => ({
      id: p.user_id,
      name: p.temp_users.name,
      isLeader: false,
      isObserver: p.is_observer,
    }))

  return {
    id: roomId,
    title: roomData.title,
    storyLink: roomData.story_link || "",
    leader,
    users,
    currentRound: {
      id: roundsData.id,
      isOpen: roundsData.is_open,
      votes,
      result: roundsData.is_open
        ? null
        : {
            average: roundsData.average || 0,
            mode: roundsData.mode || [],
            totalVotes: roundsData.total_votes || 0,
          },
    },
    history,
  }
}

// Verificar se o usuário atual é participante da sala
export async function isRoomParticipant(roomId: string): Promise<boolean> {
  const currentUser = getCurrentUser()
  if (!currentUser) return false

  const supabase = createClientSupabaseClient()
  const { data } = await supabase
    .from("room_participants")
    .select()
    .eq("user_id", currentUser.id)
    .eq("room_id", roomId)
    .single()

  return !!data
}

// Obter o usuário atual para uma sala
export async function getCurrentUserForRoom(roomId: string): Promise<User | null> {
  const currentUser = getCurrentUser()
  if (!currentUser) return null

  const supabase = createClientSupabaseClient()
  const { data } = await supabase
    .from("room_participants")
    .select()
    .eq("user_id", currentUser.id)
    .eq("room_id", roomId)
    .single()

  if (!data) return null

  return {
    id: currentUser.id,
    name: currentUser.name,
    isLeader: data.is_leader,
    isObserver: data.is_observer,
  }
}

// Definir status de observador
export async function setUserObserverStatus(roomId: string, userId: string, isObserver: boolean): Promise<void> {
  const supabase = createClientSupabaseClient()

  await supabase
    .from("room_participants")
    .update({ is_observer: isObserver })
    .eq("user_id", userId)
    .eq("room_id", roomId)
}

// Registrar um voto
export async function castVote(roomId: string, userId: string, roundId: string, value: number): Promise<void> {
  const supabase = createClientSupabaseClient()

  // Verificar se já existe um voto deste usuário nesta rodada
  const { data: existingVote } = await supabase
    .from("votes")
    .select()
    .eq("user_id", userId)
    .eq("round_id", roundId)
    .single()

  if (existingVote) {
    // Atualizar o voto existente
    await supabase.from("votes").update({ value }).eq("id", existingVote.id)
  } else {
    // Criar um novo voto
    await supabase.from("votes").insert({
      user_id: userId,
      room_id: roomId,
      round_id: roundId,
      value,
    })
  }
}

// Calcular resultados de uma rodada
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

// Encerrar a votação da rodada atual
export async function endVoting(roomId: string, roundId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  // Obter todos os votos da rodada
  const { data: votesData } = await supabase.from("votes").select("value").eq("round_id", roundId)

  if (!votesData || votesData.length === 0) {
    return
  }

  // Calcular resultados
  const voteValues = votesData.map((vote) => vote.value)
  const result = calculateResults(voteValues)

  // Atualizar a rodada
  await supabase
    .from("rounds")
    .update({
      is_open: false,
      average: result.average,
      mode: result.mode,
      total_votes: result.totalVotes,
      closed_at: new Date().toISOString(),
    })
    .eq("id", roundId)
}

// Iniciar uma nova rodada
export async function startNewRound(roomId: string): Promise<string> {
  const supabase = createClientSupabaseClient()

  // Criar nova rodada
  const { data: newRound } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      is_open: true,
    })
    .select()
    .single()

  return newRound!.id
}

// Configurar escuta de mudanças em tempo real
export function subscribeToRoom(roomId: string, callback: () => void) {
  const supabase = createClientSupabaseClient()

  // Inscrever-se em mudanças na sala
  const roomSubscription = supabase
    .channel(`room:${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, callback)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
      callback,
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` }, callback)
    .subscribe()

  return () => {
    supabase.removeChannel(roomSubscription)
  }
}
