export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cash_registers: {
        Row: {
          id: string;
          user_id: string;
          opened_at: string;
          closed_at: string | null;
          starting_cash: number;
          expected_cash: number | null;
          actual_cash: number | null;
          variance: number | null;
          notes: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opened_at?: string;
          closed_at?: string | null;
          starting_cash?: number;
          expected_cash?: number | null;
          actual_cash?: number | null;
          variance?: number | null;
          notes?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          opened_at?: string;
          closed_at?: string | null;
          starting_cash?: number;
          expected_cash?: number | null;
          actual_cash?: number | null;
          variance?: number | null;
          notes?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_registers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_registers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          qty: number;
          service_id: string | null;
          service_name: string;
          subtotal: number;
          unit: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          qty?: number;
          service_id?: string | null;
          service_name: string;
          subtotal?: number;
          unit?: string;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          qty?: number;
          service_id?: string | null;
          service_name?: string;
          subtotal?: number;
          unit?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          due_at: string | null;
          id: string;
          notes: string | null;
          order_no: string;
          received_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          order_no: string;
          received_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          order_no?: string;
          received_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          cash_register_id: string | null;
          created_at: string;
          id: string;
          method: string;
          notes: string | null;
          order_id: string;
          paid_at: string | null;
          provider: string | null;
          provider_payload: Json | null;
          provider_ref: string | null;
          provider_status: string | null;
          qris_expires_at: string | null;
          qris_qr_string: string | null;
          received_by: string | null;
          reference_no: string | null;
          status: string;
        };
        Insert: {
          amount?: number;
          cash_register_id?: string | null;
          created_at?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          order_id: string;
          paid_at?: string | null;
          provider?: string | null;
          provider_payload?: Json | null;
          provider_ref?: string | null;
          provider_status?: string | null;
          qris_expires_at?: string | null;
          qris_qr_string?: string | null;
          received_by?: string | null;
          reference_no?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          cash_register_id?: string | null;
          created_at?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          order_id?: string;
          paid_at?: string | null;
          provider?: string | null;
          provider_payload?: Json | null;
          provider_ref?: string | null;
          provider_status?: string | null;
          qris_expires_at?: string | null;
          qris_qr_string?: string | null;
          received_by?: string | null;
          reference_no?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_cash_register_id_fkey";
            columns: ["cash_register_id"];
            isOneToOne: false;
            referencedRelation: "cash_registers";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          base_price: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          unit: string;
        };
        Insert: {
          base_price?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          unit?: string;
        };
        Update: {
          base_price?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          unit?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      pay_order: {
        Args: {
          order_id: string;
          method: string;
          cash_received: number | null;
          reference_no: string | null;
          notes: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
