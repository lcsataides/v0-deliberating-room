"use client"

import type { User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Crown, Eye, Check, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface UsersListProps {
  leader: User
  users: User[]
  votes: Record<string, number>
  showVotes: boolean
}

export default function UsersList({ leader, users, votes, showVotes }: UsersListProps) {
  const allUsers = [leader, ...users]

  return (
    <div className="space-y-3">
      {allUsers.map((user) => (
        <motion.div
          key={user.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ x: 2 }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            {user.isLeader && (
              <motion.span whileHover={{ rotate: 15 }} className="text-yellow-500">
                <Crown className="h-4 w-4" />
              </motion.span>
            )}
            {user.isObserver && <Eye className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            {user.isObserver ? (
              <Badge variant="outline" className="rounded-sm">
                Observador 👁️
              </Badge>
            ) : votes[user.id] !== undefined ? (
              showVotes ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Badge className="rounded-sm bg-primary">{votes[user.id]}</Badge>
                </motion.div>
              ) : (
                <Badge variant="secondary" className="rounded-sm flex items-center gap-1">
                  <Check className="h-3 w-3" /> Votou
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="rounded-sm flex items-center gap-1">
                <Clock className="h-3 w-3" /> Aguardando
              </Badge>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
