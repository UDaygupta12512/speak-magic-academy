export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_sessions: {
        Row: {
          activity_type: string
          completed: boolean
          created_at: string
          duration_seconds: number | null
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_type: string
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          activity_type?: string
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      audio_story_listens: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number
          id: string
          story_id: string
          story_title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          story_id: string
          story_title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          story_id?: string
          story_title?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          activity_type: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      comic_books: {
        Row: {
          created_at: string
          hero: string
          id: string
          idea: string
          language: string
          page_count: number
          panels: Json
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hero?: string
          id?: string
          idea?: string
          language?: string
          page_count?: number
          panels?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hero?: string
          id?: string
          idea?: string
          language?: string
          page_count?: number
          panels?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_data: Json
          challenge_date: string
          challenge_type: string
          created_at: string
          id: string
          xp_reward: number
        }
        Insert: {
          challenge_data: Json
          challenge_date?: string
          challenge_type: string
          created_at?: string
          id?: string
          xp_reward?: number
        }
        Update: {
          challenge_data?: Json
          challenge_date?: string
          challenge_type?: string
          created_at?: string
          id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          created_at: string
          goal_date: string
          id: string
          user_id: string
          xp_earned: number
          xp_target: number
        }
        Insert: {
          created_at?: string
          goal_date?: string
          id?: string
          user_id: string
          xp_earned?: number
          xp_target?: number
        }
        Update: {
          created_at?: string
          goal_date?: string
          id?: string
          user_id?: string
          xp_earned?: number
          xp_target?: number
        }
        Relationships: []
      }
      daily_login_rewards: {
        Row: {
          claim_date: string
          created_at: string
          day_number: number
          id: string
          reward_type: string
          reward_value: number
          user_id: string
        }
        Insert: {
          claim_date?: string
          created_at?: string
          day_number?: number
          id?: string
          reward_type?: string
          reward_value?: number
          user_id: string
        }
        Update: {
          claim_date?: string
          created_at?: string
          day_number?: number
          id?: string
          reward_type?: string
          reward_value?: number
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          correct_count: number
          created_at: string
          definition: string
          difficulty: number
          example_sentence: string | null
          id: string
          next_review_at: string
          review_count: number
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          definition: string
          difficulty?: number
          example_sentence?: string | null
          id?: string
          next_review_at?: string
          review_count?: number
          updated_at?: string
          user_id: string
          word: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          definition?: string
          difficulty?: number
          example_sentence?: string | null
          id?: string
          next_review_at?: string
          review_count?: number
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game_type: string
          id: string
          max_score: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          max_score?: number
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          max_score?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      missed_topics: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          last_missed_at: string
          miss_count: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          id?: string
          last_missed_at?: string
          miss_count?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          last_missed_at?: string
          miss_count?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferred_language: string
          skill_level: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          preferred_language?: string
          skill_level?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferred_language?: string
          skill_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_progress: {
        Row: {
          audio_position: number
          completed: boolean
          created_at: string
          id: string
          paragraph_index: number
          play_mode: string
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_position?: number
          completed?: boolean
          created_at?: string
          id?: string
          paragraph_index?: number
          play_mode?: string
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_position?: number
          completed?: boolean
          created_at?: string
          id?: string
          paragraph_index?: number
          play_mode?: string
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_challenge_progress: {
        Row: {
          challenge_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          coins: number
          created_at: string
          goal_streak: number
          id: string
          last_activity_date: string | null
          lessons_completed: number
          level: number
          streak_days: number
          streak_freeze_used_date: string | null
          streak_freezes: number
          total_lessons: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          goal_streak?: number
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number
          level?: number
          streak_days?: number
          streak_freeze_used_date?: string | null
          streak_freezes?: number
          total_lessons?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          goal_streak?: number
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number
          level?: number
          streak_days?: number
          streak_freeze_used_date?: string | null
          streak_freezes?: number
          total_lessons?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          active: boolean
          id: string
          item_id: string
          item_type: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          item_id: string
          item_type?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          item_id?: string
          item_type?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_exercises: {
        Row: {
          ai_feedback: string | null
          created_at: string
          creativity_score: number | null
          grammar_score: number | null
          id: string
          prompt: string
          user_id: string
          user_response: string
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string
          creativity_score?: number | null
          grammar_score?: number | null
          id?: string
          prompt: string
          user_id: string
          user_response: string
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string
          creativity_score?: number | null
          grammar_score?: number | null
          id?: string
          prompt?: string
          user_id?: string
          user_response?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      migrate_anonymous_data: {
        Args: { anon_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
