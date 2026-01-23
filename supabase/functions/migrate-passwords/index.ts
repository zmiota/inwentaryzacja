import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MigrationResponse {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: number;
  message: string;
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

    const { data: users, error: fetchError } = await supabase
      .from("app_users")
      .select("id, login, password_hash, password_is_hashed")
      .eq("password_is_hashed", false);

    if (fetchError) {
      throw fetchError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          migrated: 0,
          skipped: 0,
          errors: 0,
          message: "Wszystkie hasła są już zahashowane",
        } as MigrationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let migrated = 0;
    let errors = 0;
    const saltRounds = 10;

    for (const user of users) {
      try {
        const hashedPassword = await bcrypt.hash(user.password_hash, saltRounds);

        const { error: updateError } = await supabase
          .from("app_users")
          .update({
            password_hash: hashedPassword,
            password_is_hashed: true,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error(`Error migrating user ${user.login}:`, updateError);
          errors++;
        } else {
          migrated++;

          await supabase
            .from("audit_log")
            .insert({
              user_id: user.id,
              action: "PASSWORD_MIGRATION",
              table_name: "app_users",
              record_id: user.id,
              ip_address: req.headers.get("x-forwarded-for") || "system",
            });
        }
      } catch (err) {
        console.error(`Error processing user ${user.login}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        skipped: 0,
        errors,
        message: `Zmigrowano ${migrated} haseł, błędów: ${errors}`,
      } as MigrationResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        migrated: 0,
        skipped: 0,
        errors: 1,
        message: "Błąd podczas migracji haseł",
      } as MigrationResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
