"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  getRoom,
  castVote,
  endVoting,
  startNewRound,
  subscribeToRoom,
  isRoomCreator,
  markNoMoreStories,
  isUsingLocalStorage,
  checkAccessibility,
  requestNotificationPermission,
  notifyAllVoted,
  notifyNewRound,
  reintegrateUser,
} from "@/lib/room-utils"
import { checkExistingRoomUser } from "@/lib/join-utils"
import type { Room, User } from "@/lib/types"
import {
  ExternalLink,
  Copy,
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  WifiOff,
  Bell,
  BellOff,
} from "lucide-react"
import VotingCards from "@/components/voting-cards"
import UsersList from "@/components/users-list"
import RoundResults from "@/components/round-results"
import VotingHistory from "@/components/voting-history"
import NewRoundModal from "@/components/new-round-modal"
import CelebrationAnimation from "@/components/celebration-animation"
import SessionClosing from "@/components/session-closing"
import DirectJoinForm from "@/components/direct-join-form"
import ConnectionDiagnostic from "@/components/connection-diagnostic"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"
import Footer from "@/components/footer"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cleanupExpiredRooms } from "@/lib/room-memory"

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewRoundModal, setShowNewRoundModal] = useState(false)
  const [allVoted, setAllVoted] = useState(false)
  const [showAllVotedAlert, setShowAllVotedAlert] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showSessionClosing, setShowSessionClosing] = useState(false)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [accessibilityIssues, setAccessibilityIssues] = useState<string[]>([])
  const [showAccessibilityAlert, setShowAccessibilityAlert] = useState(false)
  const [needsJoining, setNeedsJoining] = useState(false)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const prevRoundIdRef = useRef<string | undefined>(undefined)
  const reconnectAttemptRef = useRef<number>(0)
  const roomIdRef = useRef<string>(params.id)

  // Check accessibility and browser compatibility
  useEffect(() => {
    const { passed, issues } = checkAccessibility()
    setAccessibilityIssues(issues)
    setShowAccessibilityAlert(!passed)

    // Clean up expired rooms
    cleanupExpiredRooms()

    // Check if browser supports notifications
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true)
    }

    // Store the room ID in a ref for use in callbacks
    roomIdRef.current = params.id
  }, [])

  // Load room data
  const fetchRoomData = async () => {
    try {
      console.log(`Fetching room data for room ${params.id}`)

      // Check if user is already in the room
      const existingUserId = checkExistingRoomUser(params.id)
      console.log(`Existing user check: ${existingUserId ? "Found user" : "No user found"}`)

      if (!existingUserId) {
        console.log("User needs to join the room first")
        setNeedsJoining(true)
        setLoading(false)
        return
      }

      const roomData = await getRoom(params.id)
      if (!roomData) {
        console.error(`Room ${params.id} not found`)
        setError("Room not found")
        setLoading(false)
        return
      }

      console.log(`Room ${params.id} loaded successfully:`, {
        title: roomData.title,
        users: roomData.users.length + 1,
        currentRound: roomData.currentRound.topic,
      })

      setRoom(roomData)
      setIsOfflineMode(isUsingLocalStorage())

      // Check if user is the creator
      const userIsCreator = isRoomCreator(params.id, existingUserId)
      setIsCreator(userIsCreator)
      console.log(`User is creator: ${userIsCreator}`)

      // Find the user in the list
      const user =
        roomData.users.find((u) => u.id === existingUserId) ||
        (roomData.leader.id === existingUserId ? roomData.leader : null)

      if (user) {
        console.log(`User found in room: ${user.name} (${user.id})`)
        setCurrentUser(user)
        // Reset reconnection attempt counter
        reconnectAttemptRef.current = 0
      } else {
        console.warn(`User ${existingUserId} not found in room users list`)
        // Try to reintegrate the user
        if (reconnectAttemptRef.current < 3) {
          reconnectAttemptRef.current++
          console.log(`Attempting to reintegrate user (attempt ${reconnectAttemptRef.current}/3)`)
          const reintegrated = await reintegrateUser(params.id, existingUserId)

          if (reintegrated) {
            console.log("User successfully reintegrated")
            // User reintegrated, reload data
            fetchRoomData()
            return
          } else {
            console.error("Failed to reintegrate user")
            // If can't reintegrate after 3 attempts, show join form
            if (reconnectAttemptRef.current >= 3) {
              console.log("Max reintegration attempts reached, showing join form")
              setNeedsJoining(true)
              setLoading(false)
              return
            }
          }
        } else {
          console.log("Max reintegration attempts reached, showing join form")
          setNeedsJoining(true)
          setLoading(false)
          return
        }
      }

      // Check if everyone has voted (except observers)
      const activeUsers = [roomData.leader, ...roomData.users].filter((u) => !u.isObserver)
      const newAllVoted =
        activeUsers.length > 0 && activeUsers.every((u) => roomData.currentRound.votes[u.id] !== undefined)

      // If everyone has voted and the round is open, show alert
      if (newAllVoted && roomData.currentRound.isOpen && !allVoted) {
        setShowAllVotedAlert(true)

        // Send notification if enabled
        if (notificationsEnabled) {
          notifyAllVoted(roomData.title)
        }

        // Hide the alert after 5 seconds
        setTimeout(() => {
          setShowAllVotedAlert(false)
        }, 5000)
      }

      // Check if the round was just closed to show the celebration
      if (
        prevRoundIdRef.current === roomData.currentRound.id &&
        !roomData.currentRound.isOpen &&
        roomData.currentRound.result
      ) {
        setShowCelebration(true)
      }

      // Update the current round reference
      prevRoundIdRef.current = roomData.currentRound.id

      setAllVoted(newAllVoted)
      setLoading(false)
    } catch (err) {
      console.error("Error loading room:", err)
      setError("Error loading room data")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoomData()

    // Set up real-time listening
    const unsubscribe = subscribeToRoom(params.id, fetchRoomData)

    return () => {
      unsubscribe()
    }
  }, [params.id])

  // Handle successful direct join
  const handleJoinSuccess = (userId: string) => {
    console.log(`Join successful with userId: ${userId}`)
    // Reload the room data
    setNeedsJoining(false)
    setLoading(true)
    fetchRoomData()
  }

  // Request notification permission
  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotificationsEnabled(granted)
  }

  const handleObserverToggle = async () => {
    if (!currentUser || !room) return

    try {
      // Update observer status locally
      const newStatus = !currentUser.isObserver

      // Update local state
      setCurrentUser({
        ...currentUser,
        isObserver: newStatus,
      })

      // Update in database
      await fetch(`/api/rooms/${room.id}/users/${currentUser.id}/observer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isObserver: newStatus }),
      })
    } catch (err) {
      console.error("Error changing observer status:", err)
    }
  }

  const handleVote = async (value: number) => {
    if (!currentUser || !room || currentUser.isObserver || !room.currentRound.id) return

    try {
      await castVote(room.id, currentUser.id, room.currentRound.id, value)
    } catch (err) {
      console.error("Error casting vote:", err)
    }
  }

  const handleEndVoting = async () => {
    if (!room || !isCreator || !room.currentRound.id) return

    try {
      await endVoting(room.id, room.currentRound.id)
    } catch (err) {
      console.error("Error ending voting:", err)
    }
  }

  const handleNewRound = () => {
    setShowNewRoundModal(true)
  }

  const handleStartNewRound = async (topic: string) => {
    if (!room || !isCreator) return

    try {
      await startNewRound(room.id, topic)
      setShowNewRoundModal(false)

      // Send notification if enabled
      if (notificationsEnabled) {
        notifyNewRound(room.title, topic)
      }
    } catch (err) {
      console.error("Error starting new round:", err)
    }
  }

  const handleFinishSession = async () => {
    if (!room || !isCreator) return

    try {
      await markNoMoreStories(room.id)
      setShowSessionClosing(true)
    } catch (err) {
      console.error("Error finishing session:", err)
    }
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show direct join form if user needs to join
  if (needsJoining) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Moving gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

        <div className="container flex items-center justify-center min-h-screen relative z-10 px-4 sm:px-6">
          {showDiagnostic ? (
            <ConnectionDiagnostic roomId={params.id} onBack={() => setShowDiagnostic(false)} />
          ) : (
            <DirectJoinForm
              roomId={params.id}
              onSuccess={handleJoinSuccess}
              onDiagnose={() => setShowDiagnostic(true)}
            />
          )}
        </div>

        <Footer />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Moving gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

        <div className="container flex items-center justify-center min-h-screen relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg">Loading room...</p>
          </motion.div>
        </div>

        <Footer />
      </div>
    )
  }

  if (error || !room || !currentUser) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Moving gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

        <div className="container flex items-center justify-center min-h-screen relative z-10 px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="text-destructive" size={20} />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                <p>{error || "An error occurred while loading the room"}</p>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3 px-6 pb-6 pt-2">
                <Button onClick={() => router.push("/")} className="w-full">
                  Return to home page
                </Button>
                <Button variant="outline" onClick={() => setShowDiagnostic(true)} className="w-full">
                  Diagnose Connection Issues
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <Footer />
      </div>
    )
  }

  if (showSessionClosing) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Moving gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

        <div className="relative z-10 px-4 sm:px-6">
          <SessionClosing
            roomTitle={room.title}
            totalRounds={room.history.length + 1}
            history={room.history}
            currentRoundTopic={room.currentRound.topic}
            currentRoundAverage={room.currentRound.result?.average || 0}
            onBack={() => setShowSessionClosing(false)}
          />
        </div>

        <Footer />
      </div>
    )
  }

  const hasVoted = room.currentRound.votes[currentUser.id] !== undefined
  const canEndVoting = isCreator && allVoted && room.currentRound.isOpen
  const canStartNewRound = isCreator && !room.currentRound.isOpen

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

      <div className="container py-6 md:py-8 space-y-6 md:space-y-8 relative z-10 px-4 sm:px-6">
        <CelebrationAnimation isVisible={showCelebration} onComplete={() => setShowCelebration(false)} />

        <AnimatePresence>
          {showAccessibilityAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <p>We detected compatibility issues with your browser:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {accessibilityIssues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOfflineMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-blue-50 border-blue-200">
                <WifiOff className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  You are using offline mode. Data is being stored locally and will be synchronized when the connection
                  is restored.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAllVotedAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  All participants have voted! The room leader can end the voting.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl md:text-3xl font-bold">Deliberating Room 🏆</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <h2 className="text-lg md:text-xl">{room.title}</h2>
              <Badge className="transition-all hover:bg-primary/80">{room.id}</Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyRoomLink}
                title="Copy room link"
                className="transition-all hover:scale-110"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-600"
                >
                  Copied!
                </motion.span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full md:w-auto"
          >
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-sm" onClick={handleRequestNotifications}>
                      {notificationsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                      {notificationsEnabled ? "Notifications Active" : "Enable Notifications"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {notificationsEnabled ? "Notifications are enabled" : "Enable notifications for important events"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {room.storyLink && (
                <Button variant="outline" size="sm" className="rounded-sm hover:bg-primary/10" asChild>
                  <a
                    href={room.storyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Story 📖
                  </a>
                </Button>
              )}

              {isCreator && room.hasMoreStories && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  onClick={handleFinishSession}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="rounded-lg overflow-hidden shadow-md">
              <CardHeader className="bg-primary/5 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Voting 🗳️</CardTitle>
                    <CardDescription>
                      {room.currentRound.isOpen ? "Select a card to vote" : "Voting is closed for this round"}
                    </CardDescription>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full"
                  >
                    {room.currentRound.topic}
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 px-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="observer-mode"
                    checked={currentUser.isObserver}
                    onCheckedChange={handleObserverToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="observer-mode" className="cursor-pointer">
                    Observer mode 👁️ (cannot vote)
                  </Label>
                </div>

                <VotingCards
                  disabled={!room.currentRound.isOpen || currentUser.isObserver || hasVoted}
                  selectedValue={room.currentRound.votes[currentUser.id]}
                  onVote={handleVote}
                />

                {isCreator && (
                  <motion.div
                    className="flex justify-end gap-4 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {canEndVoting && (
                      <Button
                        className="rounded-sm bg-green-600 hover:bg-green-700 transition-all h-10"
                        onClick={handleEndVoting}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        End Voting
                      </Button>
                    )}
                    {canStartNewRound && (
                      <Button
                        className="rounded-sm flex items-center gap-2 transition-all hover:scale-105 h-10"
                        onClick={handleNewRound}
                      >
                        <PlusCircle className="h-4 w-4" />
                        New Round 🔄
                      </Button>
                    )}
                  </motion.div>
                )}

                {!room.currentRound.isOpen && room.currentRound.result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <RoundResults result={room.currentRound.result} topic={room.currentRound.topic} />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="rounded-lg overflow-hidden shadow-md">
              <CardHeader className="pb-3 bg-primary/5 px-6 py-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants 👥
                  </CardTitle>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30">{room.users.length + 1}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-6">
                <UsersList
                  leader={room.leader}
                  users={room.users}
                  votes={room.currentRound.votes}
                  showVotes={!room.currentRound.isOpen}
                />
              </CardContent>
            </Card>

            {room.history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="rounded-lg overflow-hidden shadow-md">
                  <CardHeader className="bg-primary/5 px-6 py-5">
                    <CardTitle className="text-lg">Voting History 📊</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-6">
                    <VotingHistory history={room.history} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />

      <NewRoundModal
        isOpen={showNewRoundModal}
        onClose={() => setShowNewRoundModal(false)}
        onConfirm={handleStartNewRound}
        storyLink={room.storyLink}
        currentTopicCount={room.history.length + 1}
        maxTopics={10}
      />
    </div>
  )
}
