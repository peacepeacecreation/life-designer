/**
 * Supabase Database Types
 * Auto-generated type definitions for database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          category: string
          priority: string
          status: string
          time_allocated: number
          progress_percentage: number
          start_date: string
          target_end_date: string
          actual_end_date: string | null
          tags: string[]
          created_at: string
          updated_at: string
          embedding: number[] | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          category: string
          priority: string
          status: string
          time_allocated?: number
          progress_percentage?: number
          start_date: string
          target_end_date: string
          actual_end_date?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          category?: string
          priority?: string
          status?: string
          time_allocated?: number
          progress_percentage?: number
          start_date?: string
          target_end_date?: string
          actual_end_date?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
      }
      goal_connections: {
        Row: {
          id: string
          from_goal_id: string
          to_goal_id: string
          type: string
          strength: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_goal_id: string
          to_goal_id: string
          type: string
          strength: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_goal_id?: string
          to_goal_id?: string
          type?: string
          strength?: number
          description?: string | null
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string | null
          note_type: string
          tags: string[]
          related_goal_ids: string[]
          is_pinned: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
          embedding: number[] | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          category?: string | null
          note_type?: string
          tags?: string[]
          related_goal_ids?: string[]
          is_pinned?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string | null
          note_type?: string
          tags?: string[]
          related_goal_ids?: string[]
          is_pinned?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
      }
      reflections: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          reflection_type: string
          reflection_date: string
          mood_score: number | null
          energy_level: number | null
          tags: string[]
          related_goal_ids: string[]
          related_note_ids: string[]
          created_at: string
          updated_at: string
          embedding: number[] | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          reflection_type?: string
          reflection_date?: string
          mood_score?: number | null
          energy_level?: number | null
          tags?: string[]
          related_goal_ids?: string[]
          related_note_ids?: string[]
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          reflection_type?: string
          reflection_date?: string
          mood_score?: number | null
          energy_level?: number | null
          tags?: string[]
          related_goal_ids?: string[]
          related_note_ids?: string[]
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
        }
      }
      goal_notes: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      calendar_tokens: {
        Row: {
          id: string
          user_email: string
          access_token: string
          refresh_token: string | null
          expires_at: string
          scope: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_email: string
          access_token: string
          refresh_token?: string | null
          expires_at: string
          scope: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_email?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string
          scope?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_goals: {
        Args: {
          query_embedding: number[]
          user_id: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          description: string
          category: string
          priority: string
          status: string
          tags: string[]
          created_at: string
          updated_at: string
          similarity: number
        }[]
      }
      search_notes: {
        Args: {
          query_embedding: number[]
          user_id: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          note_type: string
          is_pinned: boolean
          tags: string[]
          related_goal_ids: string[]
          created_at: string
          updated_at: string
          similarity: number
        }[]
      }
      search_reflections: {
        Args: {
          query_embedding: number[]
          user_id: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          reflection_type: string
          reflection_date: string
          mood_score: number | null
          tags: string[]
          related_goal_ids: string[]
          created_at: string
          updated_at: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
