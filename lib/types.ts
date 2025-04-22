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
  id?: string
  topic: string
  topicNumber: number
  isOpen: boolean
  votes: Record<string, number>
  result: RoundResult | null
}

export interface RoundHistoryItem {
  id: string
  topic: string
  topicNumber: number
  votes: Record<string, number>
  result: RoundResult
  timestamp: number
}

export interface Session {
  id: string
  roomId: string
  title: string
  topicCount: number
  createdAt: string
  closedAt?: string
}

export interface Room {
  id: string
  title: string
  storyLink: string
  leader: User
  users: User[]
  currentRound: Round
  history: RoundHistoryItem[]
  hasMoreStories: boolean
  currentTopicCount: number
  maxTopics: number
  sessionId?: string
}

export interface SessionUser {
  id: string
  roomId: string
}
