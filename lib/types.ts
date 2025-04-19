export interface User {
  id: string
  name: string
  isLeader: boolean
  isObserver: boolean
}

export interface RoundResult {
  average: number
  mode: number[]
  totalVotes: number
}

export interface Round {
  isOpen: boolean
  votes: Record<string, number>
  result: RoundResult | null
}

export interface RoundHistoryItem {
  votes: Record<string, number>
  result: RoundResult
  timestamp: number
}

export interface Room {
  id: string
  title: string
  storyLink: string
  leader: User
  users: User[]
  currentRound: Round
  history: RoundHistoryItem[]
}
