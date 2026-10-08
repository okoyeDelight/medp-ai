// Public signup endpoint. This function intentionally does NOT use the service-role key.
// Supabase Auth's configured email-confirmation policy must remain authoritative.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && allowedOrigins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function response(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(null, { status: 403, headers: corsHeaders(origin) });
    }
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405, origin);
  if (!origin || !allowedOrigins.includes(origin)) {
    return response({ error: "Origin not allowed" }, 403, origin);
  }

  try {
    const contentLength = Number(req.headers.get("Content-Length") ?? "0");
    if (contentLength > 8_192) return response({ error: "Request too large" }, 413, origin);

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return response({ error: "Invalid request" }, 400, origin);
    }
    const { email, password, display_name } = body as Record<string, unknown>;
    if (typeof email !== "string" || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return response({ error: "Enter a valid email address." }, 400, origin);
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return response({ error: "Password must be between 8 and 128 characters." }, 400, origin);
    }
    if (display_name !== undefined &&
        (typeof display_name !== "string" || display_name.trim().length > 80)) {
      return response({ error: "Display name must be 80 characters or fewer." }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      // Avoid returning configuration details to clients.
      console.error("Signup is unavailable: required public Supabase configuration is missing.");
      return response({ error: "Signup is temporarily unavailable." }, 503, origin);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: typeof display_name === "string" && display_name.trim()
          ? { display_name: display_name.trim() }
          : {},
      },
    });

    if (error) {
      // Log only a safe category/status; do not log passwords or request bodies.
      console.warn("Signup rejected by Supabase Auth", { status: error.status });
      return response({ error: "Unable to create account. Check your details or sign in if you already have an account." }, 400, origin);
    }

    // Do not expose tokens or mark email as confirmed here. Confirmation behavior
    // is controlled by the project's Supabase Auth settings.
    return response({
      ok: true,
      message: "If email confirmation is enabled, check your inbox to verify your address.",
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      needsEmailConfirmation: Boolean(data.user && !data.user.email_confirmed_at),
    }, 200, origin);
  } catch {
    return response({ error: "Invalid request or signup temporarily unavailable." }, 400, origin);
  }
});
