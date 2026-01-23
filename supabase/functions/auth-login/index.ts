import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    login: string;
    full_name: string;
    is_admin: boolean;
  };
  token?: string;
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

    const { login, password }: LoginRequest = await req.json();

    if (!login || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Login i hasło są wymagane",
        } as LoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, login, password_hash, full_name, is_admin")
      .eq("login", login)
      .maybeSingle();

    if (error || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nieprawidłowy login lub hasło",
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nieprawidłowy login lub hasło",
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = btoa(JSON.stringify({
      userId: user.id,
      login: user.login,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }));

    await supabase
      .from("audit_log")
      .insert({
        user_id: user.id,
        action: "LOGIN",
        table_name: "app_users",
        record_id: user.id,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          login: user.login,
          full_name: user.full_name,
          is_admin: user.is_admin,
        },
        token,
      } as LoginResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Błąd serwera",
      } as LoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
