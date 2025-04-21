"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"

interface CelebrationAnimationProps {
  isVisible: boolean
  onComplete?: () => void
}

export default function CelebrationAnimation({ isVisible, onComplete }: CelebrationAnimationProps) {
  const [animationComplete, setAnimationComplete] = useState(false)

  useEffect(() => {
    if (isVisible && !animationComplete) {
      // Trigger confetti animation
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          setAnimationComplete(true)
          if (onComplete) onComplete()
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#0774e7", "#4CAF50", "#FFC107"],
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#0774e7", "#4CAF50", "#FFC107"],
        })
      }, 250)

      return () => {
        clearInterval(interval)
      }
    }
  }, [isVisible, animationComplete, onComplete])

  return null
}
