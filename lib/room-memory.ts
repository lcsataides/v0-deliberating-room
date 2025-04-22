import type { Room } from "./types"

// Constants
const ROOM_EXPIRY_DAYS = 1
const ROOM_PREFIX = "room_"
const ROOM_CREATOR_PREFIX = "room_creator_"
const ROOM_USER_PREFIX = "room_user_"
const ROOM_HISTORY_PREFIX = "room_history_"
const CREATOR_NAME_KEY = "creator_name"

/**
 * Saves a room to localStorage with expiration
 * @param room The room to save
 */
export function saveRoomWithExpiry(room: Room): void {
  if (typeof window === "undefined") return

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + ROOM_EXPIRY_DAYS)

  const roomData = {
    data: room,
    expiry: expiryDate.getTime(),
  }

  localStorage.setItem(`${ROOM_PREFIX}${room.id}`, JSON.stringify(roomData))

  // Also save to history for the creator to retrieve later
  saveRoomToHistory(room)
}

/**
 * Saves a room to history for the creator to retrieve later
 * @param room The room to save to history
 */
function saveRoomToHistory(room: Room): void {
  if (typeof window === "undefined") return

  // Get the creator ID
  const creatorId = localStorage.getItem(`${ROOM_CREATOR_PREFIX}${room.id}`)

  if (!creatorId) return

  // Save the room to the creator's history
  const creatorHistory = getCreatorHistory(creatorId)

  // Add the room to the history if it doesn't exist
  if (!creatorHistory.some((historyRoom) => historyRoom.id === room.id)) {
    creatorHistory.push({
      id: room.id,
      title: room.title,
      timestamp: Date.now(),
    })

    // Save the updated history
    localStorage.setItem(`${ROOM_HISTORY_PREFIX}${creatorId}`, JSON.stringify(creatorHistory))
  }

  // Save the full room data
  localStorage.setItem(`${ROOM_HISTORY_PREFIX}${room.id}`, JSON.stringify(room))
}

/**
 * Gets a room from localStorage
 * @param roomId The ID of the room to get
 * @returns The room or null if not found or expired
 */
export function getRoomWithExpiry(roomId: string): Room | null {
  if (typeof window === "undefined") return null

  const roomData = localStorage.getItem(`${ROOM_PREFIX}${roomId}`)

  if (!roomData) return null

  const { data, expiry } = JSON.parse(roomData)

  // Check if the room has expired
  if (expiry && Date.now() > expiry) {
    // Room has expired, remove it
    localStorage.removeItem(`${ROOM_PREFIX}${roomId}`)
    return null
  }

  return data
}

/**
 * Gets a room from history
 * @param roomId The ID of the room to get
 * @returns The room or null if not found
 */
export function getRoomFromHistory(roomId: string): Room | null {
  if (typeof window === "undefined") return null

  const roomData = localStorage.getItem(`${ROOM_HISTORY_PREFIX}${roomId}`)

  if (!roomData) return null

  return JSON.parse(roomData)
}

/**
 * Gets the creator's room history
 * @param creatorId The ID of the creator
 * @returns The creator's room history
 */
export function getCreatorHistory(creatorId: string): Array<{ id: string; title: string; timestamp: number }> {
  if (typeof window === "undefined") return []

  const historyData = localStorage.getItem(`${ROOM_HISTORY_PREFIX}${creatorId}`)

  if (!historyData) return []

  return JSON.parse(historyData)
}

/**
 * Checks if a user is the creator of a room
 * @param roomId The ID of the room
 * @param userId The ID of the user
 * @returns True if the user is the creator of the room
 */
export function isCreatorOfRoom(roomId: string, userId: string): boolean {
  if (typeof window === "undefined") return false

  const creatorId = localStorage.getItem(`${ROOM_CREATOR_PREFIX}${roomId}`)

  return creatorId === userId
}

/**
 * Saves the creator of a room
 * @param roomId The ID of the room
 * @param userId The ID of the creator
 */
export function saveRoomCreator(roomId: string, userId: string): void {
  if (typeof window === "undefined") return

  localStorage.setItem(`${ROOM_CREATOR_PREFIX}${roomId}`, userId)
}

/**
 * Saves a user's association with a room
 * @param roomId The ID of the room
 * @param userId The ID of the user
 */
export function saveRoomUser(roomId: string, userId: string): void {
  if (typeof window === "undefined") return

  localStorage.setItem(`${ROOM_USER_PREFIX}${roomId}`, userId)
}

/**
 * Gets a user's ID for a room
 * @param roomId The ID of the room
 * @returns The user's ID or null if not found
 */
export function getRoomUser(roomId: string): string | null {
  if (typeof window === "undefined") return null

  return localStorage.getItem(`${ROOM_USER_PREFIX}${roomId}`)
}

/**
 * Saves the creator's name for future use
 * @param name The creator's name
 */
export function saveCreatorName(name: string): void {
  if (typeof window === "undefined") return

  localStorage.setItem(CREATOR_NAME_KEY, name)
}

/**
 * Gets the creator's name
 * @returns The creator's name or null if not found
 */
export function getCreatorName(): string | null {
  if (typeof window === "undefined") return null

  return localStorage.getItem(CREATOR_NAME_KEY)
}

/**
 * Cleans up expired rooms from localStorage
 */
export function cleanupExpiredRooms(): void {
  if (typeof window === "undefined") return

  // Get all keys in localStorage
  const keys = Object.keys(localStorage)

  // Filter out room keys
  const roomKeys = keys.filter((key) => key.startsWith(ROOM_PREFIX))

  // Check each room for expiry
  roomKeys.forEach((key) => {
    const roomData = localStorage.getItem(key)

    if (!roomData) return

    try {
      const { expiry } = JSON.parse(roomData)

      // Check if the room has expired
      if (expiry && Date.now() > expiry) {
        // Room has expired, remove it
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error("Error parsing room data:", error)
    }
  })
}

/**
 * Restores a room from history
 * @param roomId The ID of the room to restore
 * @returns The restored room or null if not found
 */
export function restoreRoomFromHistory(roomId: string): Room | null {
  if (typeof window === "undefined") return null

  // Get the room from history
  const room = getRoomFromHistory(roomId)

  if (!room) return null

  // Save the room with a new expiry
  saveRoomWithExpiry(room)

  return room
}
