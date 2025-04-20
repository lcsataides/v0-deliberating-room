import { createClientSupabaseClient } from "./supabase"
import type { User, Room, Round, RoundResult, RoundHistoryItem } from "./types"

// Função para gerar um ID de sala aleatório
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Função para criar uma sala
export async function createRoom(
  title: string,
  storyLink: string,
  leaderName: string,
): Promise<{ roomId: string; userId: string }> {
  const supabase = createClientSupabaseClient()
  const roomId = generateRoomId()

  // Criar a sala
  await supabase.from("rooms").insert({
    id: roomId,
    title,
    story_link: storyLink,
  })

  // Criar o usuário líder
  const { data: userData } = await supabase
    .from("users")
    .insert({
      name: leaderName,
      room_id: roomId,
      is_leader: true,
      is_observer: false,
    })
    .select()
    .single()

  // Criar a primeira rodada
  const { data: roundData } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      is_open: true,
    })
    .select()
    .single()

  return { roomId, userId: userData!.id }
}

// Função para entrar em uma sala
export async function joinRoom(roomId: string, name: string): Promise<{ userId: string }> {
  const supabase = createClientSupabaseClient()

  // Verificar se a sala existe
  const { data: roomData } = await supabase.from("rooms").select().eq("id", roomId).single()

  if (!roomData) {
    throw new Error("Sala não encontrada")
  }

  // Criar o usuário
  const { data: userData } = await supabase
    .from("users")
    .insert({
      name,
      room_id: roomId,
      is_leader: false,
      is_observer: false,
    })
    .select()
    .single()

  return { userId: userData!.id }
}

// Função para obter os dados de uma sala
export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = createClientSupabaseClient()

  // Obter dados da sala
  const { data: roomData } = await supabase.from("rooms").select().eq("id", roomId).single()

  if (!roomData) {
    return null
  }

  // Obter usuários da sala
  const { data: usersData } = await supabase.from("users").select().eq("room_id", roomId)

  if (!usersData || usersData.length === 0) {
    return null
  }

  // Encontrar o líder
  const leaderData = usersData.find((user) => user.is_leader)

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

  return {
    id: roomId,
    title: roomData.title,
    storyLink: roomData.story_link || "",
    leader,
    users,
    currentRound,
    history,
  }
}

// Função para registrar um voto
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

// Função para iniciar uma nova rodada
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

// Função para configurar a escuta de mudanças em tempo real
export function subscribeToRoom(roomId: string, callback: () => void) {
  const supabase = createClientSupabaseClient()

  // Inscrever-se em mudanças na sala
  const roomSubscription = supabase
    .channel(`room:${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `room_id=eq.${roomId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` }, callback)
    .subscribe()

  return () => {
    supabase.removeChannel(roomSubscription)
  }
}

// Função para atualizar o status de observador de um usuário
export async function setUserObserverStatus(roomId: string, userId: string, isObserver: boolean): Promise<void> {
  const supabase = createClientSupabaseClient()

  await supabase.from("users").update({ is_observer: isObserver }).eq("id", userId).eq("room_id", roomId)
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
    return new Response(JSON.stringify({ error: "Failed to update observer status" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
}

// Função para verificar se um usuário é o criador da sala
export function isRoomCreator(roomId: string, userId: string): boolean {
  const creatorId = localStorage.getItem(`room_${roomId}_creator`)
  return userId === creatorId
}
