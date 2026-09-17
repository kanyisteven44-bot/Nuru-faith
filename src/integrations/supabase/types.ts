export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context_id: string | null;
          context_label: string | null;
          context_type: string | null;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          context_id?: string | null;
          context_label?: string | null;
          context_type?: string | null;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          context_id?: string | null;
          context_label?: string | null;
          context_type?: string | null;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          sources: Json | null;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          sources?: Json | null;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          sources?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_saved_responses: {
        Row: {
          created_at: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_saved_responses_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "ai_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      approved_youtube_channels: {
        Row: {
          category: string | null;
          channel_id: string;
          channel_name: string;
          country: string | null;
          created_at: string;
          created_by: string | null;
          denomination: string | null;
          id: string;
          is_featured: boolean;
          is_verified: boolean;
          notes: string | null;
          trust_level: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          channel_id: string;
          channel_name: string;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          denomination?: string | null;
          id?: string;
          is_featured?: boolean;
          is_verified?: boolean;
          notes?: string | null;
          trust_level?: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          channel_id?: string;
          channel_name?: string;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          denomination?: string | null;
          id?: string;
          is_featured?: boolean;
          is_verified?: boolean;
          notes?: string | null;
          trust_level?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      church_members: {
        Row: {
          church_id: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          user_id: string;
        };
        Insert: {
          church_id: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          user_id: string;
        };
        Update: {
          church_id?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "church_members_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      church_resources: {
        Row: {
          approved: boolean;
          church_id: string;
          content: string;
          created_at: string;
          id: string;
          kind: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          approved?: boolean;
          church_id: string;
          content: string;
          created_at?: string;
          id?: string;
          kind: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved?: boolean;
          church_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "church_resources_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      churches: {
        Row: {
          city: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          country: string | null;
          cover_url: string | null;
          created_at: string;
          denomination: string | null;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          region: string | null;
          slug: string;
          updated_at: string;
          verified: boolean;
          website: string | null;
        };
        Insert: {
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          country?: string | null;
          cover_url?: string | null;
          created_at?: string;
          denomination?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          region?: string | null;
          slug: string;
          updated_at?: string;
          verified?: boolean;
          website?: string | null;
        };
        Update: {
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          country?: string | null;
          cover_url?: string | null;
          created_at?: string;
          denomination?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          region?: string | null;
          slug?: string;
          updated_at?: string;
          verified?: boolean;
          website?: string | null;
        };
        Relationships: [];
      };
      course_lessons: {
        Row: {
          content: string | null;
          course_id: string;
          created_at: string;
          id: string;
          media_url: string | null;
          position: number;
          reflection: string | null;
          scripture_refs: string[] | null;
          title: string;
        };
        Insert: {
          content?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          position: number;
          reflection?: string | null;
          scripture_refs?: string[] | null;
          title: string;
        };
        Update: {
          content?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          position?: number;
          reflection?: string | null;
          scripture_refs?: string[] | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      course_progress: {
        Row: {
          completed: boolean;
          completed_lessons: number;
          course_id: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_lessons?: number;
          course_id: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_lessons?: number;
          course_id?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category: string | null;
          cover_url: string | null;
          created_at: string;
          denomination: string | null;
          description: string | null;
          id: string;
          lesson_count: number;
          slug: string;
          title: string;
        };
        Insert: {
          category?: string | null;
          cover_url?: string | null;
          created_at?: string;
          denomination?: string | null;
          description?: string | null;
          id?: string;
          lesson_count?: number;
          slug: string;
          title: string;
        };
        Update: {
          category?: string | null;
          cover_url?: string | null;
          created_at?: string;
          denomination?: string | null;
          description?: string | null;
          id?: string;
          lesson_count?: number;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      devotionals: {
        Row: {
          body: string | null;
          cover_url: string | null;
          created_at: string;
          id: string;
          publish_date: string;
          read_minutes: number;
          scripture_ref: string | null;
          scripture_text: string | null;
          subtitle: string | null;
          title: string;
        };
        Insert: {
          body?: string | null;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          publish_date?: string;
          read_minutes?: number;
          scripture_ref?: string | null;
          scripture_text?: string | null;
          subtitle?: string | null;
          title: string;
        };
        Update: {
          body?: string | null;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          publish_date?: string;
          read_minutes?: number;
          scripture_ref?: string | null;
          scripture_text?: string | null;
          subtitle?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      event_attendees: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          category: string | null;
          church_id: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          host: string | null;
          id: string;
          is_online: boolean;
          location: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          host?: string | null;
          id?: string;
          is_online?: boolean;
          location?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          host?: string | null;
          id?: string;
          is_online?: boolean;
          location?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      external_reel_comments: {
        Row: {
          content: string;
          created_at: string;
          external_reel_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          external_reel_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          external_reel_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      external_reel_likes: {
        Row: {
          created_at: string;
          external_reel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          external_reel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          external_reel_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      external_reel_saves: {
        Row: {
          created_at: string;
          external_reel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          external_reel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          external_reel_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          category: string | null;
          church_id: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          member_count: number;
          name: string;
          privacy: Database["public"]["Enums"]["group_privacy"];
          slug: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          member_count?: number;
          name: string;
          privacy?: Database["public"]["Enums"]["group_privacy"];
          slug: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          member_count?: number;
          name?: string;
          privacy?: Database["public"]["Enums"]["group_privacy"];
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      media_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      media_history: {
        Row: {
          created_at: string;
          external_id: string | null;
          id: string;
          item_id: string | null;
          media_type: string | null;
          progress_seconds: number;
          source: string;
          thumbnail_url: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          external_id?: string | null;
          id?: string;
          item_id?: string | null;
          media_type?: string | null;
          progress_seconds?: number;
          source: string;
          thumbnail_url?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          external_id?: string | null;
          id?: string;
          item_id?: string | null;
          media_type?: string | null;
          progress_seconds?: number;
          source?: string;
          thumbnail_url?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_history_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
        ];
      };
      media_item_categories: {
        Row: {
          category_id: string;
          item_id: string;
        };
        Insert: {
          category_id: string;
          item_id: string;
        };
        Update: {
          category_id?: string;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_item_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "media_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_item_categories_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
        ];
      };
      media_items: {
        Row: {
          audio_url: string | null;
          can_download: boolean;
          category: string | null;
          church_id: string | null;
          created_at: string;
          created_by: string | null;
          creator_name: string | null;
          description: string | null;
          duration_seconds: number | null;
          external_id: string;
          id: string;
          is_approved: boolean;
          is_featured: boolean;
          media_type: string;
          published_at: string | null;
          scripture_ref: string | null;
          source: string;
          source_id: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          youtube_channel_id: string | null;
        };
        Insert: {
          audio_url?: string | null;
          can_download?: boolean;
          category?: string | null;
          church_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          creator_name?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          external_id: string;
          id?: string;
          is_approved?: boolean;
          is_featured?: boolean;
          media_type?: string;
          published_at?: string | null;
          scripture_ref?: string | null;
          source: string;
          source_id?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          youtube_channel_id?: string | null;
        };
        Update: {
          audio_url?: string | null;
          can_download?: boolean;
          category?: string | null;
          church_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          creator_name?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          external_id?: string;
          id?: string;
          is_approved?: boolean;
          is_featured?: boolean;
          media_type?: string;
          published_at?: string | null;
          scripture_ref?: string | null;
          source?: string;
          source_id?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          youtube_channel_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_items_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_items_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "media_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      media_playlist_items: {
        Row: {
          item_id: string;
          playlist_id: string;
          position: number;
        };
        Insert: {
          item_id: string;
          playlist_id: string;
          position?: number;
        };
        Update: {
          item_id?: string;
          playlist_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_playlist_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_playlist_items_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "media_playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      media_playlists: {
        Row: {
          category: string | null;
          church_id: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_approved: boolean;
          is_featured: boolean;
          kind: string;
          slug: string;
          title: string;
          updated_at: string;
          youtube_playlist_id: string | null;
        };
        Insert: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_approved?: boolean;
          is_featured?: boolean;
          kind?: string;
          slug: string;
          title: string;
          updated_at?: string;
          youtube_playlist_id?: string | null;
        };
        Update: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_approved?: boolean;
          is_featured?: boolean;
          kind?: string;
          slug?: string;
          title?: string;
          updated_at?: string;
          youtube_playlist_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_playlists_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      media_sources: {
        Row: {
          avatar_url: string | null;
          church_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_approved: boolean;
          is_verified: boolean;
          name: string;
          organization_id: string | null;
          source_type: string;
          updated_at: string;
          youtube_channel_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          church_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_approved?: boolean;
          is_verified?: boolean;
          name: string;
          organization_id?: string | null;
          source_type: string;
          updated_at?: string;
          youtube_channel_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          church_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_approved?: boolean;
          is_verified?: boolean;
          name?: string;
          organization_id?: string | null;
          source_type?: string;
          updated_at?: string;
          youtube_channel_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_sources_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      mentors: {
        Row: {
          bio: string | null;
          church_id: string | null;
          church_name: string | null;
          created_at: string;
          display_name: string;
          id: string;
          photo_url: string | null;
          role_title: string | null;
          specialties: string[] | null;
          user_id: string | null;
          verified: boolean;
        };
        Insert: {
          bio?: string | null;
          church_id?: string | null;
          church_name?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          photo_url?: string | null;
          role_title?: string | null;
          specialties?: string[] | null;
          user_id?: string | null;
          verified?: boolean;
        };
        Update: {
          bio?: string | null;
          church_id?: string | null;
          church_name?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          photo_url?: string | null;
          role_title?: string | null;
          specialties?: string[] | null;
          user_id?: string | null;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "mentors_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      mentorship_requests: {
        Row: {
          created_at: string;
          id: string;
          mentor_id: string;
          message: string | null;
          reason: string | null;
          requester_id: string;
          status: Database["public"]["Enums"]["mentorship_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mentor_id: string;
          message?: string | null;
          reason?: string | null;
          requester_id: string;
          status?: Database["public"]["Enums"]["mentorship_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mentor_id?: string;
          message?: string | null;
          reason?: string | null;
          requester_id?: string;
          status?: Database["public"]["Enums"]["mentorship_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "mentors";
            referencedColumns: ["id"];
          },
        ];
      };
      music_playlists: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          slug: string;
          title: string;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          slug: string;
          title: string;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      music_tracks: {
        Row: {
          artist: string;
          audio_url: string | null;
          cover_url: string | null;
          created_at: string;
          duration_seconds: number;
          genre: string | null;
          id: string;
          title: string;
        };
        Insert: {
          artist: string;
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          duration_seconds?: number;
          genre?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          artist?: string;
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          duration_seconds?: number;
          genre?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          category: string;
          created_at: string;
          id: string;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      playlist_tracks: {
        Row: {
          playlist_id: string;
          position: number;
          track_id: string;
        };
        Insert: {
          playlist_id: string;
          position?: number;
          track_id: string;
        };
        Update: {
          playlist_id?: string;
          position?: number;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "music_playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "music_tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      podcast_episodes: {
        Row: {
          audio_url: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          episode_number: number | null;
          id: string;
          podcast_id: string;
          title: string;
        };
        Insert: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          episode_number?: number | null;
          id?: string;
          podcast_id: string;
          title: string;
        };
        Update: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          episode_number?: number | null;
          id?: string;
          podcast_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_podcast_id_fkey";
            columns: ["podcast_id"];
            isOneToOne: false;
            referencedRelation: "podcasts";
            referencedColumns: ["id"];
          },
        ];
      };
      podcasts: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          host: string | null;
          id: string;
          slug: string;
          title: string;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          host?: string | null;
          id?: string;
          slug: string;
          title: string;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          host?: string | null;
          id?: string;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_author_profile_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "post_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_avatar_url: string | null;
          author_handle: string | null;
          author_id: string | null;
          author_name: string | null;
          body: string | null;
          church_id: string | null;
          comment_count: number;
          created_at: string;
          group_id: string | null;
          hashtags: string[] | null;
          id: string;
          kind: Database["public"]["Enums"]["post_kind"];
          like_count: number;
          media_url: string | null;
          scripture_ref: string | null;
          updated_at: string;
        };
        Insert: {
          author_avatar_url?: string | null;
          author_handle?: string | null;
          author_id?: string | null;
          author_name?: string | null;
          body?: string | null;
          church_id?: string | null;
          comment_count?: number;
          created_at?: string;
          group_id?: string | null;
          hashtags?: string[] | null;
          id?: string;
          kind?: Database["public"]["Enums"]["post_kind"];
          like_count?: number;
          media_url?: string | null;
          scripture_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          author_avatar_url?: string | null;
          author_handle?: string | null;
          author_id?: string | null;
          author_name?: string | null;
          body?: string | null;
          church_id?: string | null;
          comment_count?: number;
          created_at?: string;
          group_id?: string | null;
          hashtags?: string[] | null;
          id?: string;
          kind?: Database["public"]["Enums"]["post_kind"];
          like_count?: number;
          media_url?: string | null;
          scripture_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_profile_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      prayer_journal: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          scripture_ref: string | null;
          source: string | null;
          source_id: string | null;
          title: string | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          scripture_ref?: string | null;
          source?: string | null;
          source_id?: string | null;
          title?: string | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          scripture_ref?: string | null;
          source?: string | null;
          source_id?: string | null;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      prayer_requests: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_anonymous: boolean;
          prayer_count: number;
          title: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          prayer_count?: number;
          title?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          prayer_count?: number;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      prayer_support: {
        Row: {
          created_at: string;
          prayer_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          prayer_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          prayer_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prayer_support_prayer_id_fkey";
            columns: ["prayer_id"];
            isOneToOne: false;
            referencedRelation: "prayer_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          church_id: string | null;
          country: string | null;
          created_at: string;
          denomination: string | null;
          faith_streak: number;
          full_name: string | null;
          id: string;
          onboarded: boolean;
          updated_at: string;
          username: string | null;
          verified: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          church_id?: string | null;
          country?: string | null;
          created_at?: string;
          denomination?: string | null;
          faith_streak?: number;
          full_name?: string | null;
          id: string;
          onboarded?: boolean;
          updated_at?: string;
          username?: string | null;
          verified?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          church_id?: string | null;
          country?: string | null;
          created_at?: string;
          denomination?: string | null;
          faith_streak?: number;
          full_name?: string | null;
          id?: string;
          onboarded?: boolean;
          updated_at?: string;
          username?: string | null;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_plan_days: {
        Row: {
          day_number: number;
          id: string;
          plan_id: string;
          reflection: string | null;
          scripture_ref: string | null;
          title: string | null;
        };
        Insert: {
          day_number: number;
          id?: string;
          plan_id: string;
          reflection?: string | null;
          scripture_ref?: string | null;
          title?: string | null;
        };
        Update: {
          day_number?: number;
          id?: string;
          plan_id?: string;
          reflection?: string | null;
          scripture_ref?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reading_plan_days_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "reading_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_plans: {
        Row: {
          accent: string | null;
          cover_url: string | null;
          created_at: string;
          days: number;
          description: string | null;
          id: string;
          slug: string;
          title: string;
        };
        Insert: {
          accent?: string | null;
          cover_url?: string | null;
          created_at?: string;
          days?: number;
          description?: string | null;
          id?: string;
          slug: string;
          title: string;
        };
        Update: {
          accent?: string | null;
          cover_url?: string | null;
          created_at?: string;
          days?: number;
          description?: string | null;
          id?: string;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      reel_comment_likes: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reel_comment_likes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "reel_comments";
            referencedColumns: ["id"];
          },
        ];
      };
      reel_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          like_count: number;
          parent_comment_id: string | null;
          pinned: boolean;
          reel_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          like_count?: number;
          parent_comment_id?: string | null;
          pinned?: boolean;
          reel_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          like_count?: number;
          parent_comment_id?: string | null;
          pinned?: boolean;
          reel_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "reel_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reel_comments_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reel_feedback: {
        Row: {
          created_at: string;
          feedback_type: string;
          id: string;
          reel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feedback_type?: string;
          id?: string;
          reel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feedback_type?: string;
          id?: string;
          reel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reel_feedback_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
        ];
      };
      reel_likes: {
        Row: {
          created_at: string;
          reel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          reel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          reel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
        ];
      };
      reel_reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reel_id: string;
          reported_by: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reel_id: string;
          reported_by: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reel_id?: string;
          reported_by?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reel_reports_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
        ];
      };
      reel_views: {
        Row: {
          completed: boolean;
          created_at: string;
          id: string;
          reel_id: string;
          user_id: string | null;
          watch_duration: number;
        };
        Insert: {
          completed?: boolean;
          created_at?: string;
          id?: string;
          reel_id: string;
          user_id?: string | null;
          watch_duration?: number;
        };
        Update: {
          completed?: boolean;
          created_at?: string;
          id?: string;
          reel_id?: string;
          user_id?: string | null;
          watch_duration?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
        ];
      };
      reels: {
        Row: {
          audio_title: string | null;
          author_id: string | null;
          caption: string | null;
          church_id: string | null;
          comment_count: number;
          created_at: string;
          creator_avatar_url: string | null;
          creator_handle: string;
          creator_id: string | null;
          creator_name: string;
          devotional_id: string | null;
          external_id: string | null;
          external_url: string | null;
          group_id: string | null;
          hashtags: string[] | null;
          id: string;
          is_bible_teaching: boolean;
          is_public: boolean;
          like_count: number;
          poster_url: string | null;
          rights_status: string;
          scheduled_at: string | null;
          scripture_ref: string | null;
          series_id: string | null;
          source_type: string;
          status: string;
          title: string | null;
          topic: string | null;
          updated_at: string;
          uploaded_by: string | null;
          video_url: string | null;
          view_count: number;
        };
        Insert: {
          audio_title?: string | null;
          author_id?: string | null;
          caption?: string | null;
          church_id?: string | null;
          comment_count?: number;
          created_at?: string;
          creator_avatar_url?: string | null;
          creator_handle: string;
          creator_id?: string | null;
          creator_name: string;
          devotional_id?: string | null;
          external_id?: string | null;
          external_url?: string | null;
          group_id?: string | null;
          hashtags?: string[] | null;
          id?: string;
          is_bible_teaching?: boolean;
          is_public?: boolean;
          like_count?: number;
          poster_url?: string | null;
          rights_status?: string;
          scheduled_at?: string | null;
          scripture_ref?: string | null;
          series_id?: string | null;
          source_type?: string;
          status?: string;
          title?: string | null;
          topic?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          video_url?: string | null;
          view_count?: number;
        };
        Update: {
          audio_title?: string | null;
          author_id?: string | null;
          caption?: string | null;
          church_id?: string | null;
          comment_count?: number;
          created_at?: string;
          creator_avatar_url?: string | null;
          creator_handle?: string;
          creator_id?: string | null;
          creator_name?: string;
          devotional_id?: string | null;
          external_id?: string | null;
          external_url?: string | null;
          group_id?: string | null;
          hashtags?: string[] | null;
          id?: string;
          is_bible_teaching?: boolean;
          is_public?: boolean;
          like_count?: number;
          poster_url?: string | null;
          rights_status?: string;
          scheduled_at?: string | null;
          scripture_ref?: string | null;
          series_id?: string | null;
          source_type?: string;
          status?: string;
          title?: string | null;
          topic?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          video_url?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reels_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reels_devotional_id_fkey";
            columns: ["devotional_id"];
            isOneToOne: false;
            referencedRelation: "devotionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reels_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reels_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [];
      };
      saved_posts: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_reels: {
        Row: {
          created_at: string;
          reel_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          reel_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          reel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_reels_reel_id_fkey";
            columns: ["reel_id"];
            isOneToOne: false;
            referencedRelation: "reels";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_scriptures: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          reference: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reference: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reference?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      scripture_reflections: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          series_id: string | null;
          session_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          series_id?: string | null;
          session_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          series_id?: string | null;
          session_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scripture_reflections_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scripture_reflections_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      scripture_series: {
        Row: {
          author_id: string | null;
          category: string;
          church_id: string | null;
          cover_image: string | null;
          created_at: string;
          description: string | null;
          difficulty: string;
          estimated_duration: number;
          id: string;
          is_featured: boolean;
          reviewed_by: string | null;
          session_count: number;
          slug: string;
          status: string;
          title: string;
          translation_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          category?: string;
          church_id?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string;
          estimated_duration?: number;
          id?: string;
          is_featured?: boolean;
          reviewed_by?: string | null;
          session_count?: number;
          slug: string;
          status?: string;
          title: string;
          translation_id?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          category?: string;
          church_id?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string;
          estimated_duration?: number;
          id?: string;
          is_featured?: boolean;
          reviewed_by?: string | null;
          session_count?: number;
          slug?: string;
          status?: string;
          title?: string;
          translation_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scripture_series_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      scripture_series_sessions: {
        Row: {
          connections: string | null;
          context_note: string | null;
          created_at: string;
          discussion_prompt: string | null;
          id: string;
          introduction: string | null;
          main_teaching: string | null;
          position: number;
          practical_action: string | null;
          prayer: string | null;
          reflection_questions: string[];
          series_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          connections?: string | null;
          context_note?: string | null;
          created_at?: string;
          discussion_prompt?: string | null;
          id?: string;
          introduction?: string | null;
          main_teaching?: string | null;
          position: number;
          practical_action?: string | null;
          prayer?: string | null;
          reflection_questions?: string[];
          series_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          connections?: string | null;
          context_note?: string | null;
          created_at?: string;
          discussion_prompt?: string | null;
          id?: string;
          introduction?: string | null;
          main_teaching?: string | null;
          position?: number;
          practical_action?: string | null;
          prayer?: string | null;
          reflection_questions?: string[];
          series_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scripture_series_sessions_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series";
            referencedColumns: ["id"];
          },
        ];
      };
      search_logs: {
        Row: {
          created_at: string;
          id: string;
          normalized_category: string | null;
          query: string;
          result_count: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          normalized_category?: string | null;
          query: string;
          result_count?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          normalized_category?: string | null;
          query?: string;
          result_count?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      series_progress: {
        Row: {
          completed_at: string | null;
          current_session_id: string | null;
          id: string;
          progress_percent: number;
          series_id: string;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          current_session_id?: string | null;
          id?: string;
          progress_percent?: number;
          series_id: string;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          current_session_id?: string | null;
          id?: string;
          progress_percent?: number;
          series_id?: string;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_progress_current_session_id_fkey";
            columns: ["current_session_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "series_progress_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series";
            referencedColumns: ["id"];
          },
        ];
      };
      serve_opportunities: {
        Row: {
          category: string | null;
          church_id: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          location: string | null;
          requirements: string | null;
          title: string;
        };
        Insert: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          requirements?: string | null;
          title: string;
        };
        Update: {
          category?: string | null;
          church_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          requirements?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "serve_opportunities_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      session_progress: {
        Row: {
          action_done: boolean;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          id: string;
          series_id: string | null;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action_done?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          series_id?: string | null;
          session_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_done?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          series_id?: string | null;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_progress_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_progress_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      session_scriptures: {
        Row: {
          book: string | null;
          chapter_end: number | null;
          chapter_start: number | null;
          created_at: string;
          explanation: string | null;
          id: string;
          position: number;
          reference: string;
          scripture_role: string;
          session_id: string;
          verse_end: number | null;
          verse_start: number | null;
        };
        Insert: {
          book?: string | null;
          chapter_end?: number | null;
          chapter_start?: number | null;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          position?: number;
          reference: string;
          scripture_role?: string;
          session_id: string;
          verse_end?: number | null;
          verse_start?: number | null;
        };
        Update: {
          book?: string | null;
          chapter_end?: number | null;
          chapter_start?: number | null;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          position?: number;
          reference?: string;
          scripture_role?: string;
          session_id?: string;
          verse_end?: number | null;
          verse_start?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_scriptures_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "scripture_series_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [];
      };
      user_interests: {
        Row: {
          interest: string;
          user_id: string;
        };
        Insert: {
          interest: string;
          user_id: string;
        };
        Update: {
          interest?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_media_follows: {
        Row: {
          created_at: string;
          source_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          source_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          source_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_media_follows_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "media_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      user_media_saves: {
        Row: {
          created_at: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_media_saves_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_reading_progress: {
        Row: {
          current_day: number;
          id: string;
          plan_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          current_day?: number;
          id?: string;
          plan_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_day?: number;
          id?: string;
          plan_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_reading_progress_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "reading_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          church_id: string | null;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          church_id?: string | null;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          church_id?: string | null;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "churches";
            referencedColumns: ["id"];
          },
        ];
      };
      verse_highlights: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          reference: string;
          user_id: string;
          verse: number;
          verse_text: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          reference: string;
          user_id: string;
          verse: number;
          verse_text: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          reference?: string;
          user_id?: string;
          verse?: number;
          verse_text?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role:
        | "user"
        | "mentor"
        | "church_admin"
        | "moderator"
        | "super_admin"
        | "creator"
        | "verified_creator";
      group_privacy: "public" | "private" | "church_only";
      mentorship_status: "pending" | "accepted" | "declined" | "ended";
      post_kind:
        | "text"
        | "image"
        | "video"
        | "prayer"
        | "testimony"
        | "reflection"
        | "event"
        | "announcement";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "user",
        "mentor",
        "church_admin",
        "moderator",
        "super_admin",
        "creator",
        "verified_creator",
      ],
      group_privacy: ["public", "private", "church_only"],
      mentorship_status: ["pending", "accepted", "declined", "ended"],
      post_kind: [
        "text",
        "image",
        "video",
        "prayer",
        "testimony",
        "reflection",
        "event",
        "announcement",
      ],
    },
  },
} as const;
