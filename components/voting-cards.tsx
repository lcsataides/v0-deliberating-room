"use client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface VotingCardsProps {
  disabled: boolean
  selectedValue?: number
  onVote: (value: number) => void
}

export default function VotingCards({ disabled, selectedValue, onVote }: VotingCardsProps) {
  // Fibonacci sequence for voting
  const fibonacciValues = [1, 2, 3, 5, 8, 13, 21]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
      {fibonacciValues.map((value, index) => (
        <motion.button
          key={value}
          onClick={() => onVote(value)}
          disabled={disabled}
          className={cn(
            "relative h-24 rounded-md border-2 flex items-center justify-center transition-all",
            "hover:border-primary hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
            selectedValue === value ? "border-primary bg-primary/10 shadow-md" : "border-border",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-2xl font-bold">{value}</span>
          {selectedValue === value && (
            <motion.div
              className="absolute inset-0 rounded-md border-2 border-primary"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  )
}
