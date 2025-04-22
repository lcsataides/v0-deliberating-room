"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DirectRoomEntry() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!roomId) return

    setIsChecking(true)

    try {
      // Check if room exists before redirecting
      const response = await fetch(`/api/rooms/check?id=${roomId.toUpperCase()}`)
      const data = await response.json()

      if (data.exists) {
        // Room exists, redirect to it
        router.push(`/r/${roomId.toUpperCase()}`)
      } else {
        setError("Room not found. Please check the room ID and try again.")
        setIsChecking(false)
      }
    } catch (err) {
      console.error("Error checking room:", err)
      setError("An error occurred while checking the room. Please try again.")
      setIsChecking(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 w-full">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="direct-room-id" className="sr-only">
              Room ID
            </Label>
            <Input
              id="direct-room-id"
              placeholder="Enter room ID to join directly"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11" disabled={isChecking}>
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Join <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
