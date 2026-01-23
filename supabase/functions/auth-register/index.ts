import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  login: string;
  password: string;
  full_name?: string;
  is_admin?: boolean;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    login: string;
    full_name: string;
    is_admin: boolean;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { login, password, full_name, is_admin }: RegisterRequest = await req.json();

    if (!login || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Login i hasło są wymagane",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (login.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Login musi mieć co najmniej 3 znaki",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Hasło musi mieć co najmniej 6 znaków",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingUser } = await supabase
      .from("app_users")
      .select("id")
      .eq("login", login)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Login jest już zajęty",
        } as RegisterResponse),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data: newUser, error } = await supabase
      .from("app_users")
      .insert({
        login,
        password_hash,
        full_name: full_name || "",
        is_admin: is_admin || false,
      })
      .select("id, login, full_name, is_admin")
      .single();

    if (error || !newUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Błąd podczas tworzenia użytkownika",
        } as RegisterResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("audit_log")
      .insert({
        user_id: newUser.id,
        action: "REGISTER",
        table_name: "app_users",
        record_id: newUser.id,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser,
      } as RegisterResponse),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Register error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Błąd serwera",
      } as RegisterResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
