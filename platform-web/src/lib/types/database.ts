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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          ai_score: number | null
          analysis_error: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"]
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          organization_id: string
          owner_id: string | null
          recommendation: string | null
          stage: Database["public"]["Enums"]["app_stage"]
          updated_at: string
        }
        Insert: {
          ai_score?: number | null
          analysis_error?: string | null
          analysis_status?: Database["public"]["Enums"]["analysis_status"]
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          organization_id: string
          owner_id?: string | null
          recommendation?: string | null
          stage?: Database["public"]["Enums"]["app_stage"]
          updated_at?: string
        }
        Update: {
          ai_score?: number | null
          analysis_error?: string | null
          analysis_status?: Database["public"]["Enums"]["analysis_status"]
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          organization_id?: string
          owner_id?: string | null
          recommendation?: string | null
          stage?: Database["public"]["Enums"]["app_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          current_company: string | null
          current_role: string | null
          email: string
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          source: string
        }
        Insert: {
          created_at?: string
          current_company?: string | null
          current_role?: string | null
          email: string
          full_name: string
          id?: string
          organization_id: string
          phone?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          current_company?: string | null
          current_role?: string | null
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reports: {
        Row: {
          created_at: string
          recommendation: string | null
          scorecard: Json
          session_id: string
          summary: string
        }
        Insert: {
          created_at?: string
          recommendation?: string | null
          scorecard?: Json
          session_id: string
          summary?: string
        }
        Update: {
          created_at?: string
          recommendation?: string | null
          scorecard?: Json
          session_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          candidate_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          job_id: string | null
          mode: string
          organization_id: string
          scores: Json
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          transcript: Json
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          mode?: string
          organization_id: string
          scores?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          transcript?: Json
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          mode?: string
          organization_id?: string
          scores?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          transcript?: Json
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          department: string | null
          description: string
          employment_type: string
          id: string
          location: string | null
          organization_id: string
          requirements: string[]
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string
          employment_type?: string
          id?: string
          location?: string | null
          organization_id: string
          requirements?: string[]
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string
          employment_type?: string
          id?: string
          location?: string | null
          organization_id?: string
          requirements?: string[]
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          ats_score: number
          breakdown: Json
          created_at: string
          id: string
          job_id: string | null
          organization_id: string
          overall_score: number
          red_flags: Json
          resume_id: string
          skills_found: string[]
          skills_missing: string[]
        }
        Insert: {
          ats_score?: number
          breakdown?: Json
          created_at?: string
          id?: string
          job_id?: string | null
          organization_id: string
          overall_score?: number
          red_flags?: Json
          resume_id: string
          skills_found?: string[]
          skills_missing?: string[]
        }
        Update: {
          ats_score?: number
          breakdown?: Json
          created_at?: string
          id?: string
          job_id?: string | null
          organization_id?: string
          overall_score?: number
          red_flags?: Json
          resume_id?: string
          skills_found?: string[]
          skills_missing?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "resume_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_analyses_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          byte_size: number
          candidate_id: string | null
          file_name: string
          id: string
          mime_type: string
          organization_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          byte_size: number
          candidate_id?: string | null
          file_name: string
          id?: string
          mime_type: string
          organization_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          byte_size?: number
          candidate_id?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          organization_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { invite_token: string }; Returns: string }
      provision_organization: { Args: { org_name: string }; Returns: string }
      user_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
    }
    Enums: {
      analysis_status: "pending" | "processing" | "complete" | "failed"
      app_stage:
        | "new"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
      job_status: "draft" | "open" | "paused" | "closed"
      org_role:
        | "owner"
        | "admin"
        | "recruiter"
        | "hiring_manager"
        | "interviewer"
      session_status: "created" | "in_progress" | "completed" | "abandoned"
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
    Enums: {
      analysis_status: ["pending", "processing", "complete", "failed"],
      app_stage: [
        "new",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
      ],
      job_status: ["draft", "open", "paused", "closed"],
      org_role: [
        "owner",
        "admin",
        "recruiter",
        "hiring_manager",
        "interviewer",
      ],
      session_status: ["created", "in_progress", "completed", "abandoned"],
    },
  },
} as const
