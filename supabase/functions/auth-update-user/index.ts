import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateUserRequest {
  userId: string;
  full_name?: string;
  password?: string;
  is_admin?: boolean;
}

interface UpdateUserResponse {
  success: boolean;
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

    const { userId, full_name, password, is_admin }: UpdateUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ID użytkownika jest wymagane",
        } as UpdateUserResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }

    if (is_admin !== undefined) {
      updateData.is_admin = is_admin;
    }

    if (password && password.length > 0) {
      if (password.length < 6) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Hasło musi mieć co najmniej 6 znaków",
          } as UpdateUserResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
      updateData.password_is_hashed = true;
    }

    const { error } = await supabase
      .from("app_users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Błąd podczas aktualizacji użytkownika",
        } as UpdateUserResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("audit_log")
      .insert({
        user_id: userId,
        action: "USER_UPDATE",
        table_name: "app_users",
        record_id: userId,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });

    return new Response(
      JSON.stringify({
        success: true,
      } as UpdateUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Update user error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Błąd serwera",
      } as UpdateUserResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
