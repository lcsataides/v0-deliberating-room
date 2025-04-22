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
  saveCreatorName,
} from "./room-memory"
import { generateRandomFunName } from "./name-generator"

// Function to generate a random room ID
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Function to generate a UUID
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Function to get device ID for user tracking
export function getDeviceId(): string {
  if (typeof window === "undefined") return generateUUID()

  let deviceId = localStorage.getItem("device_id")
  if (!deviceId) {
    deviceId = generateUUID()
    localStorage.setItem("device_id", deviceId)
  }
  return deviceId
}

// Function to create a room
export async function createRoom(
  title: string,
  storyLink: string,
  leaderName: string,
): Promise<{ roomId: string; userId: string }> {
  try {
    // Generate room and user IDs
    const roomId = generateRoomId()
    const userId = generateUUID()
    const deviceId = getDeviceId()
    const sessionId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      console.log("Creating room in Supabase:", { roomId, title, storyLink, leaderName })

      // Create the room with creator name
      const { error: roomError } = await supabase.from("rooms").insert({
        id: roomId,
        title,
        story_link: storyLink,
        is_active: true,
        creator_name: leaderName,
        current_topic_count: 0,
        max_topics: 10,
      })

      if (roomError) {
        console.error("Error creating room in Supabase:", roomError)
        throw roomError
      }

      // Create the leader user
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: userId,
          name: leaderName,
          room_id: roomId,
          is_leader: true,
          is_observer: true, // Leader starts as observer by default
          device_id: deviceId,
        })
        .select()

      if (userError) {
        console.error("Error creating user in Supabase:", userError)
        throw userError
      }

      // Create a session
      const { error: sessionError } = await supabase.from("sessions").insert({
        id: sessionId,
        room_id: roomId,
        title: `Session for ${title}`,
        topic_count: 0,
      })

      if (sessionError) {
        console.error("Error creating session in Supabase:", sessionError)
        throw sessionError
      }

      // Generate a fun name for the first round
      const firstRoundTopic = generateRandomFunName()

      // Create the first round
      const roundId = generateUUID()
      const { error: roundError } = await supabase.from("rounds").insert({
        id: roundId,
        room_id: roomId,
        is_open: true,
        topic: firstRoundTopic,
        topic_number: 1,
        session_id: sessionId,
      })

      if (roundError) {
        console.error("Error creating round in Supabase:", roundError)
        throw roundError
      }

      // Save the session user and creator
      saveRoomUser(roomId, userId)
      saveRoomCreator(roomId, userId)
      saveCreatorName(leaderName)

      // Create room locally as fallback
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
          topicNumber: 1,
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
        currentTopicCount: 1,
        maxTopics: 10,
        sessionId,
      }

      // Save the room with expiration
      saveRoomWithExpiry(room)

      return { roomId, userId }
    } catch (supabaseError) {
      console.error("Error using Supabase, using local fallback:", supabaseError)

      // Fallback: create room locally
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
          topicNumber: 1,
          isOpen: true,
          votes: {},
          result: null,
        },
        history: [],
        hasMoreStories: true,
        currentTopicCount: 1,
        maxTopics: 10,
        sessionId,
      }

      saveRoomWithExpiry(room)
      saveRoomUser(roomId, userId)
      saveRoomCreator(roomId, userId)
      saveCreatorName(leaderName)

      return { roomId, userId }
    }
  } catch (error) {
    console.error("Detailed error creating room:", error)
    throw new Error("Failed to create room. Please try again.")
  }
}

// Function to join a room
export async function joinRoom(roomId: string, name: string): Promise<{ userId: string }> {
  try {
    // Check if user is already in the room (for reintegration)
    const existingUserId = getRoomUser(roomId)
    if (existingUserId) {
      // Check if room exists locally
      const localRoom = getRoomWithExpiry(roomId)
      if (localRoom) {
        // Check if user exists in the room
        const existingUser =
          localRoom.users.find((u) => u.id === existingUserId) ||
          (localRoom.leader.id === existingUserId ? localRoom.leader : null)

        if (existingUser) {
          console.log("User reintegrated to room:", { userId: existingUserId, name: existingUser.name })
          return { userId: existingUserId }
        }
      }
    }

    const userId = generateUUID()
    const deviceId = getDeviceId()

    try {
      const supabase = createClientSupabaseClient()

      // Check if room exists
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId)

      if (roomError) {
        console.error("Error checking room in Supabase:", roomError)
        throw roomError
      }

      if (!roomData || roomData.length === 0) {
        throw new Error("Room not found")
      }

      // Create the user
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        name,
        room_id: roomId,
        is_leader: false,
        is_observer: false,
        device_id: deviceId,
      })

      if (userError) {
        console.error("Error creating user in Supabase:", userError)
        throw userError
      }

      // Save the session user
      saveRoomUser(roomId, userId)

      return { userId }
    } catch (supabaseError: any) {
      console.error("Error using Supabase, checking local fallback:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error accessing the room. Check your permissions or try again later.")
      }

      // Check if room exists locally
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) {
        // Try to restore room from history
        const restoredRoom = restoreRoomFromHistory(roomId)
        if (!restoredRoom) {
          throw new Error("Room not found")
        }

        // Add user to restored room
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

      // Add user to local room
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
    console.error("Detailed error joining room:", error)

    // More specific error message for the user
    if (error.message.includes("permission")) {
      throw new Error("Permission error accessing the room. Check your permissions or try again later.")
    } else if (error.message.includes("not found")) {
      throw new Error("Room not found. Check the room ID and try again.")
    } else {
      throw new Error("Failed to join room. Please try again.")
    }
  }
}

// Function to get room data
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Get room data
      const { data: roomData, error: roomError } = await supabase.from("rooms").select().eq("id", roomId)

      if (roomError) {
        console.error("Error getting room from Supabase:", roomError)
        throw roomError
      }

      if (!roomData || roomData.length === 0) {
        throw new Error("Room not found")
      }

      // Get the first result if there are multiple
      const roomInfo = roomData[0]

      // Get room users
      const { data: usersData, error: usersError } = await supabase.from("users").select().eq("room_id", roomId)

      if (usersError) {
        console.error("Error getting users from Supabase:", usersError)
        throw usersError
      }

      if (!usersData || usersData.length === 0) {
        throw new Error("No users found in room")
      }

      // Find the leader
      const leaderData = usersData.find((user) => user.is_leader)

      if (!leaderData) {
        throw new Error("Leader not found in room")
      }

      // Get current round
      const { data: roundsData, error: roundsError } = await supabase
        .from("rounds")
        .select()
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (roundsError) {
        console.error("Error getting round from Supabase:", roundsError)
        throw roundsError
      }

      if (!roundsData || roundsData.length === 0) {
        throw new Error("No rounds found in room")
      }

      const currentRoundData = roundsData[0]

      // Get current round votes
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select()
        .eq("round_id", currentRoundData.id)

      if (votesError) {
        console.error("Error getting votes from Supabase:", votesError)
        throw votesError
      }

      // Convert votes to expected format
      const votes: Record<string, number> = {}
      votesData?.forEach((vote) => {
        votes[vote.user_id] = vote.value
      })

      // Get previous rounds for history
      const { data: historyRoundsData, error: historyError } = await supabase
        .from("rounds")
        .select()
        .eq("room_id", roomId)
        .eq("is_open", false)
        .order("created_at", { ascending: false })

      if (historyError) {
        console.error("Error getting history from Supabase:", historyError)
        throw historyError
      }

      // Convert previous rounds to expected format
      const history: RoundHistoryItem[] = []

      if (historyRoundsData && historyRoundsData.length > 0) {
        for (const historyRound of historyRoundsData) {
          // Get votes for the historical round
          const { data: historyVotesData, error: historyVotesError } = await supabase
            .from("votes")
            .select()
            .eq("round_id", historyRound.id)

          if (historyVotesError) {
            console.error("Error getting historical votes from Supabase:", historyVotesError)
            continue
          }

          // Convert votes to expected format
          const historyVotes: Record<string, number> = {}
          historyVotesData?.forEach((vote) => {
            historyVotes[vote.user_id] = vote.value
          })

          history.push({
            id: historyRound.id,
            topic: historyRound.topic || "Round without topic",
            topicNumber: historyRound.topic_number || 0,
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

      // Convert to expected format
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
        topic: currentRoundData.topic || "Round without topic",
        topicNumber: currentRoundData.topic_number || 1,
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

      // Use has_more_stories value if it exists, or set to true by default
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
        currentTopicCount: roomInfo.current_topic_count || history.length + 1,
        maxTopics: roomInfo.max_topics || 10,
        sessionId: currentRoundData.session_id,
      }

      // Update local room as fallback
      saveRoomWithExpiry(room)

      return room
    } catch (supabaseError: any) {
      console.error("Error using Supabase, using local fallback:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error accessing the room. Check your permissions or try again later.")
      }

      // Fallback: get room locally
      const localRoom = getRoomWithExpiry(roomId)

      // If not found locally, try to restore from history
      if (!localRoom) {
        return restoreRoomFromHistory(roomId)
      }

      return localRoom
    }
  } catch (error: any) {
    console.error("Detailed error getting room:", error)

    // More specific error message for the user
    if (error.message.includes("permission")) {
      throw new Error("Permission error accessing the room. Check your permissions or try again later.")
    } else if (error.message.includes("not found")) {
      throw new Error("Room not found. Check the room ID and try again.")
    } else {
      throw new Error("Failed to get room data. Please try again.")
    }
  }
}

// Function to get current user
export function getCurrentUser(roomId: string): string | null {
  return getRoomUser(roomId)
}

// Function to check if user is room creator
export function isRoomCreator(roomId: string, userId: string): boolean {
  return isCreatorOfRoom(roomId, userId)
}

// Function to set user observer status
export async function setUserObserverStatus(roomId: string, userId: string, isObserver: boolean): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("users")
        .update({ is_observer: isObserver, last_active_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("room_id", roomId)

      if (error) {
        console.error("Error updating observer status in Supabase:", error)
        throw error
      }
    } catch (supabaseError: any) {
      console.error("Error using Supabase, updating locally:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error updating status. Check your permissions or try again later.")
      }

      // Fallback: update locally
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
    console.error("Detailed error updating observer status:", error)
    throw new Error("Failed to update observer status. Please try again.")
  }
}

// Function to cast a vote
export async function castVote(roomId: string, userId: string, roundId: string, value: number): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Check if user already voted in this round
      const { data: existingVote, error: checkError } = await supabase
        .from("votes")
        .select()
        .eq("user_id", userId)
        .eq("round_id", roundId)

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing vote in Supabase:", checkError)
        throw checkError
      }

      if (existingVote && existingVote.length > 0) {
        // Update existing vote
        const { error: updateError } = await supabase.from("votes").update({ value }).eq("id", existingVote[0].id)
        if (updateError) {
          console.error("Error updating vote in Supabase:", updateError)
          throw updateError
        }
      } else {
        // Create a new vote
        const { error: insertError } = await supabase.from("votes").insert({
          id: generateUUID(),
          user_id: userId,
          room_id: roomId,
          round_id: roundId,
          value,
        })
        if (insertError) {
          console.error("Error inserting vote in Supabase:", insertError)
          throw insertError
        }
      }

      // Update user's last active timestamp
      await supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("room_id", roomId)
    } catch (supabaseError: any) {
      console.error("Error using Supabase, updating locally:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error casting vote. Check your permissions or try again later.")
      }

      // Fallback: cast vote locally
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) return

      if (localRoom.currentRound.id === roundId) {
        localRoom.currentRound.votes[userId] = value
        saveRoomWithExpiry(localRoom)
      }
    }
  } catch (error) {
    console.error("Detailed error casting vote:", error)
    throw new Error("Failed to cast vote. Please try again.")
  }
}

// Function to calculate round results
function calculateResults(votes: number[]): RoundResult {
  if (votes.length === 0) {
    return {
      average: 0,
      mode: [],
      totalVotes: 0,
    }
  }

  // Calculate average
  const sum = votes.reduce((acc, val) => acc + val, 0)
  const average = sum / votes.length

  // Calculate mode (most common value)
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

// Function to end voting for current round
export async function endVoting(roomId: string, roundId: string): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Get all votes for the round
      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("value")
        .eq("round_id", roundId)

      if (votesError) {
        console.error("Error getting votes from Supabase:", votesError)
        throw votesError
      }

      if (!votesData || votesData.length === 0) {
        throw new Error("No votes to end the round")
      }

      // Calculate results
      const voteValues = votesData.map((vote) => vote.value)
      const result = calculateResults(voteValues)

      // Update the round
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
        console.error("Error updating round in Supabase:", updateError)
        throw updateError
      }
    } catch (supabaseError: any) {
      console.error("Error using Supabase, updating locally:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error ending voting. Check your permissions or try again later.")
      }

      // Fallback: end voting locally
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom || localRoom.currentRound.id !== roundId) return

      // Calculate results
      const votes = Object.values(localRoom.currentRound.votes)
      if (votes.length === 0) {
        throw new Error("No votes to end the round")
      }

      const result = calculateResults(votes)

      // Update the round
      localRoom.currentRound.isOpen = false
      localRoom.currentRound.result = result

      // Add to history
      localRoom.history.unshift({
        id: roundId,
        topic: localRoom.currentRound.topic,
        topicNumber: localRoom.currentRound.topicNumber,
        votes: { ...localRoom.currentRound.votes },
        result,
        timestamp: Date.now(),
      })

      saveRoomWithExpiry(localRoom)
    }
  } catch (error) {
    console.error("Detailed error ending voting:", error)
    throw new Error("Failed to end voting. Please try again.")
  }
}

// Function to start a new round
export async function startNewRound(roomId: string, topic: string): Promise<string> {
  try {
    const roundId = generateUUID()

    try {
      const supabase = createClientSupabaseClient()

      // Get current room data to check topic count
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("current_topic_count, max_topics")
        .eq("id", roomId)
        .single()

      if (roomError) {
        console.error("Error getting room data for topic count:", roomError)
        throw roomError
      }

      const currentTopicCount = (roomData?.current_topic_count || 0) + 1
      const maxTopics = roomData?.max_topics || 10

      if (currentTopicCount > maxTopics) {
        throw new Error(`Maximum number of topics (${maxTopics}) reached for this session`)
      }

      // Get current session ID
      const { data: sessionData, error: sessionError } = await supabase
        .from("rounds")
        .select("session_id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (sessionError && sessionError.code !== "PGRST116") {
        console.error("Error getting session ID:", sessionError)
        throw sessionError
      }

      const sessionId = sessionData?.session_id || generateUUID()

      // Create new round
      const { error } = await supabase.from("rounds").insert({
        id: roundId,
        room_id: roomId,
        is_open: true,
        topic: topic || generateRandomFunName(),
        topic_number: currentTopicCount,
        session_id: sessionId,
      })

      if (error) {
        console.error("Error creating new round in Supabase:", error)
        throw error
      }

      // Update room topic count
      await supabase.from("rooms").update({ current_topic_count: currentTopicCount }).eq("id", roomId)

      return roundId
    } catch (supabaseError: any) {
      console.error("Error using Supabase, updating locally:", supabaseError)

      // Check if it's a 406 error (Not Acceptable)
      if (supabaseError.status === 406) {
        console.error("406 error detected - Possible permissions issue:", supabaseError)
        throw new Error("Permission error starting new round. Check your permissions or try again later.")
      }

      // Fallback: create new round locally
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) throw new Error("Room not found")

      // Check topic count
      const currentTopicCount = localRoom.currentTopicCount + 1
      if (currentTopicCount > localRoom.maxTopics) {
        throw new Error(`Maximum number of topics (${localRoom.maxTopics}) reached for this session`)
      }

      // Create new round
      const newRound: Round = {
        id: roundId,
        topic: topic || generateRandomFunName(),
        topicNumber: currentTopicCount,
        isOpen: true,
        votes: {},
        result: null,
      }

      // Update the room
      localRoom.currentRound = newRound
      localRoom.currentTopicCount = currentTopicCount
      saveRoomWithExpiry(localRoom)

      return roundId
    }
  } catch (error) {
    console.error("Detailed error starting new round:", error)
    throw new Error("Failed to start new round. Please try again.")
  }
}

// Function to mark that there are no more stories
export async function markNoMoreStories(roomId: string): Promise<void> {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Try to update the has_more_stories column
      const { error } = await supabase.from("rooms").update({ has_more_stories: false }).eq("id", roomId)

      if (error) {
        console.error("Error marking end of stories in Supabase:", error)

        // If the error is related to the column not existing, continue with the fallback
        if (error.message && error.message.includes("has_more_stories")) {
          throw new Error("has_more_stories column doesn't exist")
        } else {
          throw error
        }
      }
    } catch (supabaseError) {
      console.error("Error using Supabase, updating locally:", supabaseError)

      // Fallback: update locally
      const localRoom = getRoomWithExpiry(roomId)
      if (!localRoom) return

      localRoom.hasMoreStories = false
      saveRoomWithExpiry(localRoom)
    }
  } catch (error) {
    console.error("Detailed error marking end of stories:", error)
    // Don't throw error here, just continue with the local fallback
  }
}

// Function to set up real-time changes listener
export function subscribeToRoom(roomId: string, callback: () => void) {
  try {
    try {
      const supabase = createClientSupabaseClient()

      // Subscribe to room changes
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `room_id=eq.${roomId}` },
          callback,
        )
        .subscribe()

      return () => {
        supabase.removeChannel(roomSubscription)
      }
    } catch (supabaseError) {
      console.error("Error setting up real-time listener:", supabaseError)

      // Fallback: set up local polling
      const intervalId = setInterval(callback, 5000)
      return () => clearInterval(intervalId)
    }
  } catch (error) {
    console.error("Detailed error setting up real-time listener:", error)
    // Return a no-op cleanup function
    return () => {}
  }
}

// API to update observer status
export async function updateObserverStatus(req: Request, roomId: string, userId: string): Promise<Response> {
  try {
    const { isObserver } = await req.json()

    await setUserObserverStatus(roomId, userId, isObserver)

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Error in observer status API:", error)
    return new Response(JSON.stringify({ error: "Failed to update observer status" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
}

// Function to clean up expired rooms
export function scheduledCleanupExpiredRooms(): void {
  cleanupExpiredRooms()
}

// Function to reintegrate a member who lost connection
export async function reintegrateUser(roomId: string, userId: string): Promise<boolean> {
  try {
    // Check if room exists
    const room = await getRoom(roomId)

    if (!room) {
      return false
    }

    // Check if user exists in the room
    const userExists = room.users.some((u) => u.id === userId) || room.leader.id === userId

    if (!userExists) {
      return false
    }

    // User exists, reintegrate
    return true
  } catch (error) {
    console.error("Error reintegrating user:", error)
    return false
  }
}

// Function to check if the app is using localStorage (offline mode)
export function isUsingLocalStorage(): boolean {
  try {
    const supabase = createClientSupabaseClient()
    return false
  } catch (error) {
    return true
  }
}

// Function to check application accessibility
export function checkAccessibility(): { passed: boolean; issues: string[] } {
  const issues: string[] = []

  // Check if browser supports localStorage
  if (typeof window !== "undefined" && !window.localStorage) {
    issues.push("Your browser doesn't support localStorage, which is necessary for offline functionality.")
  }

  // Check if browser supports fetch
  if (typeof window !== "undefined" && !window.fetch) {
    issues.push("Your browser doesn't support fetch, which is necessary for server communication.")
  }

  // Check if browser supports flexbox
  if (typeof window !== "undefined" && !CSS.supports("display", "flex")) {
    issues.push("Your browser doesn't support flexbox, which may affect the application layout.")
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

// Function to check required integrations
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

// Function to request notification permission
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

// Function to notify when all users have voted
export function notifyAllVoted(roomTitle: string): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  new Notification("All voted!", {
    body: `All participants have voted in room "${roomTitle}". The leader can end the voting.`,
    icon: "/favicon.ico",
  })
}

// Function to notify when a new round is started
export function notifyNewRound(roomTitle: string, topic: string): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  new Notification("New round started!", {
    body: `A new round has been started in room "${roomTitle}": ${topic}`,
    icon: "/favicon.ico",
  })
}

// Function to check if browser supports all necessary features
export function checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
  const issues: string[] = []

  // Check localStorage
  if (typeof window !== "undefined" && !window.localStorage) {
    issues.push("Your browser doesn't support localStorage")
  }

  // Check fetch
  if (typeof window !== "undefined" && !window.fetch) {
    issues.push("Your browser doesn't support fetch")
  }

  // Check flexbox
  if (typeof window !== "undefined" && !CSS.supports("display", "flex")) {
    issues.push("Your browser doesn't support flexbox")
  }

  // Check grid
  if (typeof window !== "undefined" && !CSS.supports("display", "grid")) {
    issues.push("Your browser doesn't support grid")
  }

  return {
    compatible: issues.length === 0,
    issues,
  }
}

// Function to manually trigger database purge
export async function triggerDatabasePurge(): Promise<boolean> {
  try {
    const supabase = createClientSupabaseClient()
    const { error } = await supabase.rpc("purge_expired_data")

    if (error) {
      console.error("Error purging database:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Failed to trigger database purge:", error)
    return false
  }
}
