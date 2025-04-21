import { getRoom, joinRoom } from "./room-utils"
import { saveRoomUser } from "./room-memory"

/**
 * Error types for room joining
 */
export enum JoinRoomErrorType {
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Error response for room joining
 */
export interface JoinRoomError {
  type: JoinRoomErrorType
  message: string
  details?: any
}

/**
 * Success response for room joining
 */
export interface JoinRoomSuccess {
  userId: string
  roomId: string
  isNewUser: boolean
}

/**
 * Join a room directly from URL
 * @param roomId The room ID to join
 * @param name The user's name
 * @returns A promise that resolves to a success or error response
 */
export async function joinRoomFromUrl(roomId: string, name: string): Promise<JoinRoomSuccess | JoinRoomError> {
  try {
    console.log(`Attempting to join room ${roomId} as ${name}`)

    // First check if the room exists
    try {
      const room = await getRoom(roomId)
      if (!room) {
        console.error(`Room ${roomId} not found`)
        return {
          type: JoinRoomErrorType.ROOM_NOT_FOUND,
          message: "Sala não encontrada. Verifique o ID da sala e tente novamente.",
        }
      }
      console.log(`Room ${roomId} found:`, { title: room.title, users: room.users.length + 1 })
    } catch (error: any) {
      console.error(`Error checking room ${roomId}:`, error)

      if (error.message?.includes("não encontrada")) {
        return {
          type: JoinRoomErrorType.ROOM_NOT_FOUND,
          message: "Sala não encontrada. Verifique o ID da sala e tente novamente.",
        }
      }

      if (error.message?.includes("permissão")) {
        return {
          type: JoinRoomErrorType.PERMISSION_ERROR,
          message: "Erro de permissão ao acessar a sala. Verifique suas permissões ou tente novamente mais tarde.",
          details: error,
        }
      }

      return {
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: "Erro ao verificar a sala. Por favor, tente novamente.",
        details: error,
      }
    }

    // Now try to join the room
    try {
      const { userId } = await joinRoom(roomId, name)
      console.log(`Successfully joined room ${roomId} with userId ${userId}`)

      // Ensure the user ID is saved in localStorage for this room
      saveRoomUser(roomId, userId)

      return {
        userId,
        roomId,
        isNewUser: true,
      }
    } catch (error: any) {
      console.error(`Error joining room ${roomId}:`, error)

      if (error.message?.includes("não encontrada")) {
        return {
          type: JoinRoomErrorType.ROOM_NOT_FOUND,
          message: "Sala não encontrada. Verifique o ID da sala e tente novamente.",
        }
      }

      if (error.message?.includes("permissão")) {
        return {
          type: JoinRoomErrorType.PERMISSION_ERROR,
          message: "Erro de permissão ao entrar na sala. Verifique suas permissões ou tente novamente mais tarde.",
          details: error,
        }
      }

      if (error.message?.includes("network") || error.message?.includes("rede")) {
        return {
          type: JoinRoomErrorType.NETWORK_ERROR,
          message: "Erro de conexão. Verifique sua conexão com a internet e tente novamente.",
          details: error,
        }
      }

      return {
        type: JoinRoomErrorType.UNKNOWN_ERROR,
        message: "Erro ao entrar na sala. Por favor, tente novamente.",
        details: error,
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in joinRoomFromUrl:", error)
    return {
      type: JoinRoomErrorType.UNKNOWN_ERROR,
      message: "Erro inesperado ao entrar na sala. Por favor, tente novamente.",
      details: error,
    }
  }
}

/**
 * Check if a user is already in a room
 * @param roomId The room ID to check
 * @returns The user ID if the user is in the room, null otherwise
 */
export function checkExistingRoomUser(roomId: string): string | null {
  if (typeof window === "undefined") return null

  // Check if there's a user ID stored for this room
  const userId = localStorage.getItem(`room_${roomId}_user`)
  if (!userId) return null

  console.log(`Found existing user ${userId} for room ${roomId}`)
  return userId
}

/**
 * Diagnose room connection issues
 * @param roomId The room ID to diagnose
 * @returns A diagnostic report
 */
export async function diagnoseRoomConnection(roomId: string): Promise<{
  roomExists: boolean
  localStorageWorks: boolean
  supabaseWorks: boolean
  userInRoom: boolean
  userId: string | null
  diagnosticDetails: any
}> {
  const diagnosticDetails: any = {}
  let roomExists = false
  let localStorageWorks = false
  let supabaseWorks = false
  let userInRoom = false
  let userId = null

  // Check localStorage
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("_test_", "test")
      const test = localStorage.getItem("_test_")
      localStorageWorks = test === "test"
      localStorage.removeItem("_test_")

      // Check if user is in room
      userId = localStorage.getItem(`room_${roomId}_user`)
      userInRoom = !!userId
    }
  } catch (error) {
    diagnosticDetails.localStorageError = error
  }

  // Check if room exists
  try {
    const room = await getRoom(roomId)
    roomExists = !!room
    if (room) {
      diagnosticDetails.roomDetails = {
        title: room.title,
        userCount: room.users.length + 1,
        currentRoundOpen: room.currentRound.isOpen,
      }

      // Check if user is in the room's user list
      if (userId) {
        const userInList = room.users.some((u) => u.id === userId) || room.leader.id === userId
        diagnosticDetails.userInList = userInList
      }
    }
    supabaseWorks = true
  } catch (error) {
    diagnosticDetails.roomError = error

    // Try to determine if Supabase is working despite the error
    try {
      const { createClientSupabaseClient } = await import("./supabase")
      const supabase = createClientSupabaseClient()
      const { data, error: pingError } = await supabase.from("rooms").select("id").limit(1)
      supabaseWorks = !pingError
      diagnosticDetails.supabasePing = { success: !pingError, data }
    } catch (supabaseError) {
      diagnosticDetails.supabaseError = supabaseError
    }
  }

  return {
    roomExists,
    localStorageWorks,
    supabaseWorks,
    userInRoom,
    userId,
    diagnosticDetails,
  }
}
