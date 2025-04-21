import { createClientSupabaseClient } from "./supabase"
import type { User, Room, Round, RoundResult, RoundHistoryItem } from "./types"
import {
  saveRoomWithExpiry,
  getRoomWithExpiry,
  saveRoomCreator,
  saveRoomUser,
  getRoomUser,
  isCreatorOfRoom,
  restoreRoomFromHistory,
  cleanupExpiredRooms,
} from "./room-memory"
import { generateRandomFunName } from "./name-generator"

// Função para gerar um ID de sala aleatório
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
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

      // Criar a sala - Removendo has_more_stories para evitar erros de esquema
      const { error: roomError } = await supabase.from("rooms").insert({
        id: roomId,
        title,
        story_link: storyLink,
        is_active: true,
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

      if (userError) {
        console.error("Erro ao criar usuário no Supabase:", userError)
        throw userError
      }

      console.log("Criando primeira rodada no Supabase:", { roomId })

      // Gerar um nome divertido para a primeira rodada
      const firstRoundTopic = generateRandomFunName()

      // Criar a primeira rodada
      const roundId = generateUUID()
      const { error: roundError } = await supabase.from("rounds").insert({
        id: roundId,
        room_id: roomId,
        is_open: true,
        topic: firstRoundTopic, // Usar o nome divertido gerado
      })

      if (roundError) {
        console.error("Erro ao criar rodada no Supabase:", roundError)
        throw roundError
      }

      // Salvar o usuário da sessão e o criador
      saveRoomUser(roomId, userId)
      saveRoomCreator(roomId, userId)

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
          topic: firstRoundTopic,
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
      }

      // Salvar a sala com expiração
      saveRoomWithExpiry(room)

      return { roomId, userId }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, usando fallback local:", supabaseError)

      // Fallback: criar sala localmente
      const roundId = generateUUID()
      const firstRoundTopic = generateRandomFunName()

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
          topic: firstRoundTopic,
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
      }

      saveRoomWithExpiry(room)
      saveRoomUser(roomId, userId)
      saveRoomCreator(roomId, userId)

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
    // Verificar se o usuário já está na sala (para reintegração)
    const existingUserId = getRoomUser(roomId)
    if (existingUserId) {
      // Verificar se a sala existe localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (localRoom) {
        // Verificar se o usuário existe na sala
        const existingUser =
          localRoom.users.find((u) => u.id === existingUserId) ||
          (localRoom.leader.id === existingUserId ? localRoom.leader : null)

        if (existingUser) {
          console.log("Usuário reintegrado à sala:", { userId: existingUserId, name: existingUser.name })
          return { userId: existingUserId }
        }
      }
    }

    const userId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      // Verificar se a sala existe
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId)

      if (roomError) {
        console.error("Erro ao verificar sala no Supabase:", roomError)
        throw roomError
      }

      if (!roomData || roomData.length === 0) {
        throw new Error("Sala não encontrada")
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
      saveRoomUser(roomId, userId)

      return { userId }
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, verificando fallback local:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error("Erro de permissão ao acessar a sala. Verifique suas permissões ou tente novamente mais tarde.")
      }

      // Verificar se a sala existe localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) {
        // Tentar restaurar a sala do histórico
        const restoredRoom = restoreRoomFromHistory(roomId)
        if (!restoredRoom) {
          throw new Error("Sala não encontrada")
        }

        // Adicionar usuário à sala restaurada
        const updatedUsers = [
          ...restoredRoom.users,
          {
            id: userId,
            name,
            isLeader: false,
            isObserver: false,
          },
        ]

        const updatedRoom = {
          ...restoredRoom,
          users: updatedUsers,
        }

        saveRoomWithExpiry(updatedRoom)
        saveRoomUser(roomId, userId)

        return { userId }
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

      saveRoomWithExpiry(updatedRoom)
      saveRoomUser(roomId, userId)

      return { userId }
    }
  } catch (error: any) {
    console.error("Erro detalhado ao entrar na sala:", error)

    // Mensagem de erro mais específica para o usuário
    if (error.message.includes("permissão")) {
      throw new Error("Erro de permissão ao acessar a sala. Verifique suas permissões ou tente novamente mais tarde.")
    } else if (error.message.includes("não encontrada")) {
      throw new Error("Sala não encontrada. Verifique o ID da sala e tente novamente.")
    } else {
      throw new Error("Falha ao entrar na sala. Por favor, tente novamente.")
    }
  }
}

// Função para obter os dados de uma sala
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Obter dados da sala
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId)

      if (roomError) {
        console.error("Erro ao obter sala do Supabase:", roomError)
        throw roomError
      }

      if (!roomData || roomData.length === 0) {
        throw new Error("Sala não encontrada")
      }

      // Pegar o primeiro resultado se houver múltiplos
      const roomInfo = roomData[0]

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

      if (roundsError) {
        console.error("Erro ao obter rodada do Supabase:", roundsError)
        throw roundsError
      }

      if (!roundsData || roundsData.length === 0) {
        throw new Error("Nenhuma rodada encontrada na sala")
      }

      const currentRoundData = roundsData[0]

      // Obter votos da rodada atual
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select()
        .eq("round_id", currentRoundData.id)

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
        id: currentRoundData.id,
        topic: currentRoundData.topic || "Rodada sem tópico",
        isOpen: currentRoundData.is_open,
        votes,
        result: currentRoundData.is_open
          ? null
          : {
              average: currentRoundData.average || 0,
              mode: currentRoundData.mode || [],
              totalVotes: currentRoundData.total_votes || 0,
            },
      }

      // Usar o valor de has_more_stories se existir, ou definir como true por padrão
      const hasMoreStories = roomInfo.has_more_stories !== undefined ? roomInfo.has_more_stories : true

      const room: Room = {
        id: roomId,
        title: roomInfo.title,
        storyLink: roomInfo.story_link || "",
        leader,
        users,
        currentRound,
        history,
        hasMoreStories,
      }

      // Atualizar a sala local como fallback
      saveRoomWithExpiry(room)

      return room
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, usando fallback local:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error("Erro de permissão ao acessar a sala. Verifique suas permissões ou tente novamente mais tarde.")
      }

      // Fallback: obter sala localmente
      const localRoom = getRoomWithExpiry(roomId)

      // Se não encontrar localmente, tentar restaurar do histórico
      if (!localRoom) {
        return restoreRoomFromHistory(roomId)
      }

      return localRoom
    }
  } catch (error: any) {
    console.error("Erro detalhado ao obter sala:", error)

    // Mensagem de erro mais específica para o usuário
    if (error.message.includes("permissão")) {
      throw new Error("Erro de permissão ao acessar a sala. Verifique suas permissões ou tente novamente mais tarde.")
    } else if (error.message.includes("não encontrada")) {
      throw new Error("Sala não encontrada. Verifique o ID da sala e tente novamente.")
    } else {
      throw new Error("Falha ao obter dados da sala. Por favor, tente novamente.")
    }
  }
}

// Função para obter o usuário atual
export function getCurrentUser(roomId: string): string | null {
  return getRoomUser(roomId)
}

// Função para verificar se o usuário é o criador da sala
export function isRoomCreator(roomId: string, userId: string): boolean {
  return isCreatorOfRoom(roomId, userId)
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
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error(
          "Erro de permissão ao atualizar status. Verifique suas permissões ou tente novamente mais tarde.",
        )
      }

      // Fallback: atualizar localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) return

      if (localRoom.leader.id === userId) {
        localRoom.leader.isObserver = isObserver
      } else {
        const userIndex = localRoom.users.findIndex((u) => u.id === userId)
        if (userIndex >= 0) {
          localRoom.users[userIndex].isObserver = isObserver
        }
      }

      saveRoomWithExpiry(localRoom)
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

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Erro ao verificar voto existente no Supabase:", checkError)
        throw checkError
      }

      if (existingVote && existingVote.length > 0) {
        // Atualizar o voto existente
        const { error: updateError } = await supabase.from("votes").update({ value }).eq("id", existingVote[0].id)
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
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error("Erro de permissão ao registrar voto. Verifique suas permissões ou tente novamente mais tarde.")
      }

      // Fallback: registrar voto localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) return

      if (localRoom.currentRound.id === roundId) {
        localRoom.currentRound.votes[userId] = value
        saveRoomWithExpiry(localRoom)
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
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error(
          "Erro de permissão ao encerrar votação. Verifique suas permissões ou tente novamente mais tarde.",
        )
      }

      // Fallback: encerrar votação localmente
      const localRoom = getRoomWithExpiry(roomId)
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

      saveRoomWithExpiry(localRoom)
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
        topic: topic || generateRandomFunName(), // Usar o tópico fornecido ou gerar um nome divertido
      })

      if (error) {
        console.error("Erro ao criar nova rodada no Supabase:", error)
        throw error
      }

      return roundId
    } catch (supabaseError: any) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Verificar se é um erro 406 (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("Erro 406 detectado - Possível problema de permissões:", supabaseError)
        throw new Error(
          "Erro de permissão ao iniciar nova rodada. Verifique suas permissões ou tente novamente mais tarde.",
        )
      }

      // Fallback: criar nova rodada localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) throw new Error("Sala não encontrada")

      // Criar nova rodada
      const newRound: Round = {
        id: roundId,
        topic: topic || generateRandomFunName(),
        isOpen: true,
        votes: {},
        result: null,
      }

      // Atualizar a sala
      localRoom.currentRound = newRound
      saveRoomWithExpiry(localRoom)

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

      // Verificar se a coluna has_more_stories existe
      try {
        // Tentar atualizar a coluna has_more_stories
        const { error } = await supabase.from("rooms").update({ has_more_stories: false }).eq("id", roomId)

        if (error) {
          console.error("Erro ao marcar fim das histórias no Supabase:", error)

          // Se o erro for relacionado à coluna não existente, apenas continue com o fallback
          if (error.message && error.message.includes("has_more_stories")) {
            throw new Error("Coluna has_more_stories não existe")
          } else {
            throw error
          }
        }
      } catch (columnError) {
        console.error("Erro com a coluna has_more_stories, usando fallback:", columnError)
        // Continuar com o fallback local
        throw columnError
      }
    } catch (supabaseError) {
      console.error("Erro ao usar Supabase, atualizando localmente:", supabaseError)

      // Fallback: atualizar localmente
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) return

      localRoom.hasMoreStories = false
      saveRoomWithExpiry(localRoom)
    }
  } catch (error) {
    console.error("Erro detalhado ao marcar fim das histórias:", error)
    // Não lançar erro aqui, apenas continuar com o fallback local
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

// Função para limpar salas expiradas
export function scheduledCleanupExpiredRooms(): void {
  cleanupExpiredRooms()
}

// Função para reintegrar um membro que perdeu a conexão
export async function reintegrateUser(roomId: string, userId: string): Promise<boolean> {
  try {
    // Verificar se a sala existe
    const room = await getRoom(roomId)

    if (!room) {
      return false
    }

    // Verificar se o usuário existe na sala
    const userExists = room.users.some((u) => u.id === userId) || room.leader.id === userId

    if (!userExists) {
      return false
    }

    // Usuário existe, reintegrar
    return true
  } catch (error) {
    console.error("Erro ao reintegrar usuário:", error)
    return false
  }
}

// Função para verificar se o aplicativo está usando localStorage (modo offline)
export function isUsingLocalStorage(): boolean {
  try {
    const supabase = createClientSupabaseClient()
    return false
  } catch (error) {
    return true
  }
}

// Função para verificar a acessibilidade da aplicação
export function checkAccessibility(): { passed: boolean; issues: string[] } {
  const issues: string[] = []

  // Verificar se o navegador suporta localStorage
  if (typeof window !== "undefined" && !window.localStorage) {
    issues.push("Seu navegador não suporta localStorage, o que é necessário para o funcionamento offline.")
  }

  // Verificar se o navegador suporta fetch
  if (typeof window !== "undefined" && !window.fetch) {
    issues.push("Seu navegador não suporta fetch, o que é necessário para comunicação com o servidor.")
  }

  // Verificar se o navegador suporta flexbox
  if (typeof window !== "undefined" && !CSS.supports("display", "flex")) {
    issues.push("Seu navegador não suporta flexbox, o que pode afetar o layout da aplicação.")
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

// Função para verificar integrações necessárias
export function checkRequiredIntegrations(): {
  supabase: boolean
  localStorage: boolean
  notifications: boolean
} {
  return {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    localStorage: typeof window !== "undefined" && !!window.localStorage,
    notifications: typeof window !== "undefined" && "Notification" in window,
  }
}

// Função para solicitar permissão para notificações
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

// Função para enviar notificação quando todos votaram
export function notifyAllVoted(roomTitle: string): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  new Notification("Todos votaram!", {
    body: `Todos os participantes votaram na sala "${roomTitle}". O líder pode encerrar a votação.`,
    icon: "/favicon.ico",
  })
}

// Função para enviar notificação quando uma nova rodada é iniciada
export function notifyNewRound(roomTitle: string, topic: string): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  new Notification("Nova rodada iniciada!", {
    body: `Uma nova rodada foi iniciada na sala "${roomTitle}": ${topic}`,
    icon: "/favicon.ico",
  })
}

// Função para verificar se o navegador suporta todas as funcionalidades necessárias
export function checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
  const issues: string[] = []

  // Verificar localStorage
  if (typeof window !== "undefined" && !window.localStorage) {
    issues.push("Seu navegador não suporta localStorage")
  }

  // Verificar fetch
  if (typeof window !== "undefined" && !window.fetch) {
    issues.push("Seu navegador não suporta fetch")
  }

  // Verificar flexbox
  if (typeof window !== "undefined" && !CSS.supports("display", "flex")) {
    issues.push("Seu navegador não suporta flexbox")
  }

  // Verificar grid
  if (typeof window !== "undefined" && !CSS.supports("display", "grid")) {
    issues.push("Seu navegador não suporta grid")
  }

  return {
    compatible: issues.length === 0,
    issues,
  }
}
