"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function DirectRoomEntry() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!roomId) return

    // Redirect to the direct room entry page
    router.push(`/r/${roomId.toUpperCase()}`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Label htmlFor="direct-room-id" className="sr-only">
            ID da Sala
          </Label>
          <Input
            id="direct-room-id"
            placeholder="Digite o ID da sala para entrar diretamente"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-10">
          Entrar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </motion.div>
  )
}
