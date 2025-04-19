import type { Room, User, RoundResult, RoundHistoryItem } from "./types"

// Local storage keys
const ROOMS_KEY = "deliberating-rooms"
const USER_ROOMS_KEY = "user-rooms"

// Generate a random room ID
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Get all rooms from local storage
function getRooms(): Record<string, Room> {
  if (typeof window === "undefined") return {}

  const roomsJson = localStorage.getItem(ROOMS_KEY)
  return roomsJson ? JSON.parse(roomsJson) : {}
}

// Save rooms to local storage
function saveRooms(rooms: Record<string, Room>): void {
  if (typeof window === "undefined") return

  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
}

// Get a specific room
export function getRoom(roomId: string): Room | null {
  const rooms = getRooms()
  return rooms[roomId] || null
}

// Create a new room
export function createRoom(room: Room): void {
  const rooms = getRooms()
  rooms[room.id] = room
  saveRooms(rooms)

  // Save user association
  saveUserRoom(room.leader.id, room.id)
}

// Update a room
export function updateRoom(room: Room): void {
  const rooms = getRooms()
  rooms[room.id] = room
  saveRooms(rooms)
}

// Save user-room association
function saveUserRoom(userId: string, roomId: string): void {
  if (typeof window === "undefined") return

  const userRoomsJson = localStorage.getItem(USER_ROOMS_KEY)
  const userRooms = userRoomsJson ? JSON.parse(userRoomsJson) : {}
  userRooms[userId] = roomId
  localStorage.setItem(USER_ROOMS_KEY, JSON.stringify(userRooms))
}

// Join a room
export function joinRoom(roomId: string, user: User): void {
  const room = getRoom(roomId)
  if (!room) return

  room.users.push(user)
  updateRoom(room)

  // Save user association
  saveUserRoom(user.id, roomId)
}

// Get current user for a room
export function getCurrentUser(roomId: string): User | null {
  if (typeof window === "undefined") return null

  const userRoomsJson = localStorage.getItem(USER_ROOMS_KEY)
  if (!userRoomsJson) return null

  const userRooms = JSON.parse(userRoomsJson)
  const room = getRoom(roomId)
  if (!room) return null

  // Check if user is the leader
  if (Object.values(userRooms).includes(roomId)) {
    const userId = Object.keys(userRooms).find((key) => userRooms[key] === roomId)
    if (userId) {
      if (room.leader.id === userId) {
        return room.leader
      }

      // Check if user is in the users array
      const user = room.users.find((u) => u.id === userId)
      if (user) {
        return user
      }
    }
  }

  return null
}

// Set user observer status
export function setUserObserverStatus(roomId: string, userId: string, isObserver: boolean): void {
  const room = getRoom(roomId)
  if (!room) return

  if (room.leader.id === userId) {
    room.leader.isObserver = isObserver
  } else {
    const userIndex = room.users.findIndex((u) => u.id === userId)
    if (userIndex !== -1) {
      room.users[userIndex].isObserver = isObserver
    }
  }

  updateRoom(room)
}

// Cast a vote
export function castVote(roomId: string, userId: string, value: number): void {
  const room = getRoom(roomId)
  if (!room || !room.currentRound.isOpen) return

  room.currentRound.votes[userId] = value
  updateRoom(room)
}

// Calculate round results
function calculateResults(votes: Record<string, number>): RoundResult {
  const voteValues = Object.values(votes)
  if (voteValues.length === 0) {
    return {
      average: 0,
      mode: [],
      totalVotes: 0,
    }
  }

  // Calculate average
  const sum = voteValues.reduce((acc, val) => acc + val, 0)
  const average = sum / voteValues.length

  // Calculate mode (most common value)
  const counts: Record<number, number> = {}
  voteValues.forEach((val) => {
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
    totalVotes: voteValues.length,
  }
}

// End voting for the current round
export function endVoting(roomId: string): void {
  const room = getRoom(roomId)
  if (!room || !room.currentRound.isOpen) return

  // Calculate results
  const result = calculateResults(room.currentRound.votes)

  // Update current round
  room.currentRound.isOpen = false
  room.currentRound.result = result

  // Add to history
  const historyItem: RoundHistoryItem = {
    votes: { ...room.currentRound.votes },
    result,
    timestamp: Date.now(),
  }

  room.history.push(historyItem)

  updateRoom(room)
}

// Start a new round
export function startNewRound(roomId: string): void {
  const room = getRoom(roomId)
  if (!room || room.currentRound.isOpen) return

  // Reset current round
  room.currentRound = {
    isOpen: true,
    votes: {},
    result: null,
  }

  updateRoom(room)
}
