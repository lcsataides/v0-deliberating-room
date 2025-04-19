import type { User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Crown, Eye } from "lucide-react"

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
        <div key={user.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            {user.isLeader && <Crown className="h-4 w-4 text-yellow-500" />}
            {user.isObserver && <Eye className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            {user.isObserver ? (
              <Badge variant="outline" className="rounded-sm">
                Observador 👁️
              </Badge>
            ) : votes[user.id] !== undefined ? (
              showVotes ? (
                <Badge className="rounded-sm">{votes[user.id]}</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-sm">
                  Votou ✅
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="rounded-sm">
                Não votou ⏳
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
