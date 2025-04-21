export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          title: string
          story_link: string | null
          created_at: string
          is_active: boolean
          has_more_stories: boolean
        }
        Insert: {
          id: string
          title: string
          story_link?: string | null
          created_at?: string
          is_active?: boolean
          has_more_stories?: boolean
        }
        Update: {
          id?: string
          title?: string
          story_link?: string | null
          created_at?: string
          is_active?: boolean
          has_more_stories?: boolean
        }
      }
      users: {
        Row: {
          id: string
          name: string
          room_id: string
          is_leader: boolean
          is_observer: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          room_id: string
          is_leader: boolean
          is_observer?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          room_id?: string
          is_leader?: boolean
          is_observer?: boolean
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          user_id: string
          room_id: string
          round_id: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          room_id: string
          round_id: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string
          round_id?: string
          value?: number
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          room_id: string
          topic: string
          is_open: boolean
          average: number | null
          mode: number[] | null
          total_votes: number | null
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          topic: string
          is_open?: boolean
          average?: number | null
          mode?: number[] | null
          total_votes?: number | null
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          topic?: string
          is_open?: boolean
          average?: number | null
          mode?: number[] | null
          total_votes?: number | null
          created_at?: string
          closed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
