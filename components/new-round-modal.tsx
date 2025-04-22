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
  currentTopicCount: number
  maxTopics: number
}

export default function NewRoundModal({
  isOpen,
  onClose,
  onConfirm,
  storyLink,
  currentTopicCount,
  maxTopics,
}: NewRoundModalProps) {
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

  const progressPercentage = (currentTopicCount / maxTopics) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Round 🔄</DialogTitle>
            <DialogDescription>
              {storyLink
                ? "Define a topic related to the story link for the new voting round."
                : "Define a topic for the new voting round."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="col-span-4">
                Round Topic
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
                  title="Generate new name"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Generate new name</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  Topics in session: {currentTopicCount} of {maxTopics}
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>

            {storyLink && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="storyLink" className="col-span-4">
                  Story Link
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
              Cancel
            </Button>
            <Button type="submit">Start Round</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
