export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      artists: {
        Row: {
          id: string;
          artist_name: string;
          contact_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_name: string;
          contact_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_name?: string;
          contact_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shows: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          show_date: string;
          ends_at: string;
          submission_deadline: string | null;
          theme: string | null;
          venue: string | null;
          status: "scheduled" | "live" | "completed" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          show_date: string;
          ends_at: string;
          submission_deadline?: string | null;
          theme?: string | null;
          venue?: string | null;
          status?: "scheduled" | "live" | "completed" | "cancelled";
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          show_date?: string;
          ends_at?: string;
          submission_deadline?: string | null;
          theme?: string | null;
          venue?: string | null;
          status?: "scheduled" | "live" | "completed" | "cancelled";
          created_at?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          show_id: string | null;
          artist_id: string | null;
          auth_user_id: string | null;
          submitter_email: string | null;
          artist_name: string;
          track_title: string;
          track_url: string;
          genre: string;
          message: string | null;
          rights_confirmed: boolean;
          status: "pending" | "queued" | "played" | "reviewed" | "rejected";
          moderation_status: "approved" | "rejected" | "removed";
          moderated_at: string | null;
          moderated_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          show_id?: string | null;
          artist_id?: string | null;
          auth_user_id?: string | null;
          submitter_email?: string | null;
          artist_name: string;
          track_title: string;
          track_url: string;
          genre: string;
          message?: string | null;
          rights_confirmed: boolean;
          status?: "pending" | "queued" | "played" | "reviewed" | "rejected";
          moderation_status?: "approved" | "rejected" | "removed";
          moderated_at?: string | null;
          moderated_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string | null;
          artist_id?: string | null;
          auth_user_id?: string | null;
          submitter_email?: string | null;
          artist_name?: string;
          track_title?: string;
          track_url?: string;
          genre?: string;
          message?: string | null;
          rights_confirmed?: boolean;
          status?: "pending" | "queued" | "played" | "reviewed" | "rejected";
          moderation_status?: "approved" | "rejected" | "removed";
          moderated_at?: string | null;
          moderated_by_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          auth_user_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          avatar_path: string | null;
          account_status: "active" | "suspended";
          created_at: string;
          updated_at: string;
          suspended_at: string | null;
          suspended_by_user_id: string | null;
        };
        Insert: {
          auth_user_id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          avatar_path?: string | null;
          account_status?: "active" | "suspended";
          created_at?: string;
          updated_at?: string;
          suspended_at?: string | null;
          suspended_by_user_id?: string | null;
        };
        Update: {
          auth_user_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          avatar_path?: string | null;
          account_status?: "active" | "suspended";
          created_at?: string;
          updated_at?: string;
          suspended_at?: string | null;
          suspended_by_user_id?: string | null;
        };
        Relationships: [];
      };
      moderation_audit_log: {
        Row: {
          id: string;
          target_user_id: string | null;
          target_submission_id: string | null;
          moderator_user_id: string;
          moderator_email: string;
          moderator_name: string | null;
          action_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_user_id?: string | null;
          target_submission_id?: string | null;
          moderator_user_id: string;
          moderator_email: string;
          moderator_name?: string | null;
          action_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_user_id?: string | null;
          target_submission_id?: string | null;
          moderator_user_id?: string;
          moderator_email?: string;
          moderator_name?: string | null;
          action_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      noticeboard_posts: {
        Row: {
          id: string;
          title: string;
          body: string;
          tag: string | null;
          image_url: string | null;
          image_path: string | null;
          posted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          tag?: string | null;
          image_url?: string | null;
          image_path?: string | null;
          posted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          tag?: string | null;
          image_url?: string | null;
          image_path?: string | null;
          posted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      totn_nominations: {
        Row: {
          id: string;
          submission_id: string | null;
          show_id: string | null;
          artist_name: string;
          track_title: string;
          reason: string | null;
          votes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id?: string | null;
          show_id?: string | null;
          artist_name: string;
          track_title: string;
          reason?: string | null;
          votes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string | null;
          show_id?: string | null;
          artist_name?: string;
          track_title?: string;
          reason?: string | null;
          votes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      totn_votes: {
        Row: {
          id: string;
          nomination_id: string;
          show_id: string;
          auth_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nomination_id: string;
          show_id: string;
          auth_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nomination_id?: string;
          show_id?: string;
          auth_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_admin_dashboard_snapshot: {
        Args: Record<PropertyKey, never>;
        Returns: {
          show_id: string | null;
          show_title: string | null;
          show_date: string | null;
          ends_at: string | null;
          submission_deadline: string | null;
          theme: string | null;
          venue: string | null;
          submission_count: number;
          places_left: number;
          unplayed_count: number;
          totn_count: number;
          noticeboard_count: number;
        }[];
      };
      get_noticeboard_posts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          title: string;
          body: string;
          tag: string | null;
          image_url: string | null;
          image_path: string | null;
          posted_at: string;
          created_at: string;
        }[];
      };
      get_moderation_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          auth_user_id: string;
          display_name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
          submission_count: number;
          account_status: string;
        }[];
      };
      search_moderation_users: {
        Args: {
          p_query: string;
        };
        Returns: {
          auth_user_id: string;
          display_name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
          submission_count: number;
          account_status: string;
        }[];
      };
      set_user_account_status: {
        Args: {
          p_target_user_id: string;
          p_status: string;
        };
        Returns: Database["public"]["Tables"]["user_profiles"]["Row"];
      };
      get_moderation_submissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          submission_id: string;
          artist_name: string;
          track_title: string;
          submitter: string;
          submitter_email: string | null;
          submitter_avatar_url: string | null;
          show_id: string | null;
          show_title: string | null;
          created_at: string;
          moderation_status: string;
          queue_status: string;
        }[];
      };
      search_moderation_submissions: {
        Args: {
          p_query: string;
        };
        Returns: {
          submission_id: string;
          artist_name: string;
          track_title: string;
          submitter: string;
          submitter_email: string | null;
          submitter_avatar_url: string | null;
          show_id: string | null;
          show_title: string | null;
          created_at: string;
          moderation_status: string;
          queue_status: string;
        }[];
      };
      set_submission_moderation_status: {
        Args: {
          p_submission_id: string;
          p_status: string;
        };
        Returns: Database["public"]["Tables"]["submissions"]["Row"];
      };
      get_recent_moderation_actions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          action_type: string;
          moderator_user_id: string;
          moderator_email: string;
          moderator_name: string | null;
          target_user_id: string | null;
          target_submission_id: string | null;
          target_summary: string;
          created_at: string;
        }[];
      };
      search_noticeboard_posts_admin: {
        Args: {
          p_query: string;
        };
        Returns: {
          id: string;
          title: string;
          body: string;
          tag: string | null;
          image_url: string | null;
          image_path: string | null;
          posted_at: string;
          created_at: string;
        }[];
      };
      search_global_content: {
        Args: {
          p_query: string;
        };
        Returns: {
          result_type: string;
          result_id: string;
          title: string;
          snippet: string;
          result_date: string;
          href: string;
        }[];
      };
      get_public_recent_submissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          artist_name: string;
          track_title: string;
          genre: string;
          status: string;
          created_at: string;
          avatar_url: string | null;
        }[];
      };
      get_latest_totn_winner: {
        Args: Record<PropertyKey, never>;
        Returns: {
          show_id: string;
          show_title: string;
          artist_name: string;
          track_title: string;
          votes: number;
        }[];
      };
      get_upcoming_shows_for_admin: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          title: string;
          show_date: string;
          ends_at: string;
          submission_deadline: string | null;
          theme: string | null;
          venue: string | null;
          status: string;
          created_at: string;
        }[];
      };
      search_upcoming_shows_for_admin: {
        Args: {
          p_query: string;
        };
        Returns: {
          id: string;
          title: string;
          show_date: string;
          ends_at: string;
          submission_deadline: string | null;
          theme: string | null;
          venue: string | null;
          status: string;
          created_at: string;
        }[];
      };
      get_url_archive_shows: {
        Args: Record<PropertyKey, never>;
        Returns: {
          show_id: string;
          show_title: string;
          show_date: string;
          ends_at: string;
          theme: string | null;
          venue: string | null;
          submission_count: number;
          nomination_count: number;
          winner_submission_id: string | null;
          winner_artist_name: string | null;
          winner_track_title: string | null;
          winner_votes: number | null;
        }[];
      };
      get_url_archive_show_tracks: {
        Args: {
          p_show_id: string;
        };
        Returns: {
          submission_id: string;
          artist_name: string;
          track_title: string;
          genre: string;
          status: string;
          created_at: string;
          is_totn_nominated: boolean;
          is_totn_winner: boolean;
          nomination_votes: number;
          avatar_url: string | null;
        }[];
      };
      get_show_queue_for_active_show: {
        Args: Record<PropertyKey, never>;
        Returns: {
          show_id: string;
          show_title: string;
          show_date: string;
          submission_id: string;
          artist_name: string;
          track_title: string;
          track_url: string;
          genre: string;
          message: string | null;
          status: string;
          created_at: string;
          avatar_url: string | null;
        }[];
      };
      get_unplayed_submissions_for_upcoming_show: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          show_id: string;
          artist_name: string;
          track_title: string;
          track_url: string;
          genre: string;
          message: string | null;
          rights_confirmed: boolean;
          status: string;
          created_at: string;
          avatar_url: string | null;
        }[];
      };
      mark_submission_played: {
        Args: {
          p_submission_id: string;
        };
        Returns: Database["public"]["Tables"]["submissions"]["Row"];
      };
      mark_submission_reviewed: {
        Args: {
          p_submission_id: string;
        };
        Returns: Database["public"]["Tables"]["submissions"]["Row"];
      };
      nominate_submission_for_totn: {
        Args: {
          p_submission_id: string;
        };
        Returns: Database["public"]["Tables"]["totn_nominations"]["Row"];
      };
      cast_totn_vote: {
        Args: {
          p_nomination_id: string;
        };
        Returns: Database["public"]["Tables"]["totn_nominations"]["Row"];
      };
      create_noticeboard_post: {
        Args: {
          p_title: string;
          p_body: string;
          p_tag: string | null;
          p_image_url: string | null;
          p_image_path: string | null;
        };
        Returns: Database["public"]["Tables"]["noticeboard_posts"]["Row"];
      };
      create_show: {
        Args: {
          p_title: string | null;
          p_show_date: string;
          p_ends_at: string;
          p_submission_deadline: string | null;
          p_theme: string | null;
          p_venue: string | null;
        };
        Returns: Database["public"]["Tables"]["shows"]["Row"];
      };
      update_show: {
        Args: {
          p_show_id: string;
          p_title: string | null;
          p_show_date: string;
          p_ends_at: string;
          p_submission_deadline: string | null;
          p_theme: string | null;
          p_venue: string | null;
        };
        Returns: Database["public"]["Tables"]["shows"]["Row"];
      };
      create_submission_for_next_show: {
        Args: {
          p_artist_name: string;
          p_track_title: string;
          p_track_url: string;
          p_genre: string;
          p_message: string | null;
          p_rights_confirmed: boolean;
        };
        Returns: Database["public"]["Tables"]["submissions"]["Row"];
      };
      delete_noticeboard_post: {
        Args: {
          p_post_id: string;
        };
        Returns: Database["public"]["Tables"]["noticeboard_posts"]["Row"];
      };
      update_own_submission: {
        Args: {
          p_submission_id: string;
          p_artist_name: string;
          p_track_title: string;
          p_track_url: string;
          p_genre: string;
          p_message: string | null;
          p_rights_confirmed: boolean;
        };
        Returns: Database["public"]["Tables"]["submissions"]["Row"];
      };
      update_own_profile_display_name: {
        Args: {
          p_display_name: string;
        };
        Returns: Database["public"]["Tables"]["user_profiles"]["Row"];
      };
      update_own_profile_avatar: {
        Args: {
          p_avatar_url: string;
          p_avatar_path: string;
        };
        Returns: Database["public"]["Tables"]["user_profiles"]["Row"];
      };
      update_noticeboard_post: {
        Args: {
          p_post_id: string;
          p_title: string;
          p_body: string;
          p_tag: string | null;
          p_image_url: string | null;
          p_image_path: string | null;
        };
        Returns: Database["public"]["Tables"]["noticeboard_posts"]["Row"];
      };
      get_totn_board_for_active_show: {
        Args: Record<PropertyKey, never>;
        Returns: {
          nomination_id: string;
          submission_id: string | null;
          show_id: string;
          show_title: string;
          artist_name: string;
          track_title: string;
          votes: number;
          created_at: string;
          has_user_vote: boolean;
        }[];
      };
      get_submission_window_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          show_id: string;
          show_title: string;
          show_date: string;
          submission_deadline: string | null;
          submission_limit: number;
          current_submission_count: number;
          places_left: number;
          is_open: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SubmissionInsert = Database["public"]["Tables"]["submissions"]["Insert"];
