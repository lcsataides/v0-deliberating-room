"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { generateRandomFunName } from "@/lib/name-generator"
import { RefreshCw } from "lucide-react"

interface NewRoundModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (topic: string) => void
  storyLink?: string
}

export default function NewRoundModal({ isOpen, onClose, onConfirm, storyLink }: NewRoundModalProps) {
  const [topic, setTopic] = useState("")
  const [suggestedTopic, setSuggestedTopic] = useState("")

  // Generate a fun name when the modal opens
  useEffect(() => {
    if (isOpen) {
      generateNewSuggestedTopic()
    }
  }, [isOpen])

  const generateNewSuggestedTopic = () => {
    setSuggestedTopic(generateRandomFunName())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Use the suggested topic if the user hasn't entered anything
    onConfirm(topic || suggestedTopic)
    setTopic("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Rodada 🔄</DialogTitle>
            <DialogDescription>
              {storyLink
                ? "Defina um tópico relacionado ao link da história para a nova rodada de votação."
                : "Defina um tópico para a nova rodada de votação."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="col-span-4">
                Tópico da Rodada
              </Label>
              <div className="col-span-4 relative">
                <Input
                  id="topic"
                  placeholder={suggestedTopic}
                  className="pr-10"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={generateNewSuggestedTopic}
                  title="Gerar novo nome"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Gerar novo nome</span>
                </Button>
              </div>
            </div>

            {storyLink && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="storyLink" className="col-span-4">
                  Link da História
                </Label>
                <div className="col-span-4 bg-muted/30 p-2 rounded-md text-sm break-all">
                  <a
                    href={storyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {storyLink}
                  </a>
                </div>
              </div>
            )}
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
