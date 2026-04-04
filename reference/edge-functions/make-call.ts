import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NUMBER_816 = "+18164953325";
const NUMBER_855 = "+18557632274";

const RequestSchema = z.object({
  sellerPhone: z.string().min(10).max(20),
  callbackPhone: z.string().min(10).max(20),
  callerId: z.enum(["816", "855"]).optional().default("816"),
});

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Auth required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { sellerPhone, callbackPhone, callerId } = parsed.data;
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const outboundNumber = callerId === "855" ? NUMBER_855 : NUMBER_816;
    const supabaseUrl = "https://supabase.mavericksholdings.com";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const sellerE164 = toE164(sellerPhone);
    const callbackE164 = toE164(callbackPhone);

    // TwiML URL — includes apikey so Kong allows the unauthenticated Twilio callback
    const twimlUrl = `${supabaseUrl}/functions/v1/twiml-connect?apikey=${anonKey}&to=${encodeURIComponent(sellerE164)}&from=${encodeURIComponent(outboundNumber)}`;

    const params = new URLSearchParams({
      To: callbackE164,
      From: outboundNumber,
      Url: twimlUrl,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const callData = await response.json();
    if (!response.ok) {
      console.error("Twilio call error:", callData);
      throw new Error(callData.message ?? "Twilio error");
    }

    console.log(`Two-leg call: ${callbackE164} → ${sellerE164}, SID: ${callData.sid}`);

    return new Response(JSON.stringify({ success: true, callSid: callData.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("make-call error:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to initiate call" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
