"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NewRoundModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (topic: string) => void
}

export default function NewRoundModal({ isOpen, onClose, onConfirm }: NewRoundModalProps) {
  const [topic, setTopic] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(topic)
    setTopic("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Rodada 🔄</DialogTitle>
            <DialogDescription>Defina um tópico para a nova rodada de votação.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="col-span-4">
                Tópico da Rodada
              </Label>
              <Input
                id="topic"
                placeholder="Ex: Estimativa da tarefa #123"
                className="col-span-4"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Iniciar Rodada</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
