"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRoom } from "@/lib/room-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Footer from "@/components/footer"
import { getCreatorName } from "@/lib/room-memory"

export default function CreateRoom() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomTitle, setRoomTitle] = useState("")
  const [storyLink, setStoryLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Load creator name from localStorage if available
  useEffect(() => {
    const savedName = getCreatorName()
    if (savedName) {
      setName(savedName)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !roomTitle) {
      setError("Name and room title are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Starting room creation...")

      // Create the room
      const { roomId, userId } = await createRoom(roomTitle, storyLink, name)

      console.log("Room created successfully:", { roomId, userId })

      // Navigate to the room
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("Detailed error creating room:", err)
      setError(err.message || "An error occurred while creating the room. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

      <div className="container flex items-center justify-center min-h-screen py-12 relative z-10">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Deliberating Room 🚀</CardTitle>
            <CardDescription>Configure a new deliberation room as leader 👑</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Your Name 👤</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomTitle">Room Title 📝</Label>
                <Input
                  id="roomTitle"
                  placeholder="Enter room title"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storyLink">Story Link (Optional) 🔗</Label>
                <Input
                  id="storyLink"
                  placeholder="Enter link to the story"
                  value={storyLink}
                  onChange={(e) => setStoryLink(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">Creating...</span>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  "Create Room 🚀"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
