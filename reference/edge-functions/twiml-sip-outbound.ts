import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NUMBER_816 = "+18164953325"; // 816-495-DEAL
const NUMBER_855 = "+18557632274"; // 855-763-CASH

serve(async (req) => {
  const params: Record<string, string> = {};
  if (req.method === "POST") {
    try {
      const text = await req.text();
      for (const [k, v] of new URLSearchParams(text)) params[k] = v;
    } catch { /* ignore */ }
  }
  for (const [k, v] of new URL(req.url).searchParams) {
    if (!params[k]) params[k] = v;
  }

  // Pick caller ID based on query param (default 816)
  const callerIdParam = params.caller_id ?? "816";
  const callerId = callerIdParam === "855" ? NUMBER_855 : NUMBER_816;

  // Twilio sends To as a SIP URI: sip:+18165551234@domain or just +18165551234
  const rawTo = params.To ?? params.to ?? "";
  const match = rawTo.match(/\+?1?(\d{10})/);
  if (!match) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unable to complete call. Invalid number.</Say></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  }
  const to = `+1${match[1]}`;

  console.log(`SIP outbound (${callerIdParam}): ${params.From ?? "unknown"} → ${to}`);

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`,
    { headers: { "Content-Type": "application/xml" } }
  );
});
