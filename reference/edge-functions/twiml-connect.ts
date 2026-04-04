import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Called by Twilio in two scenarios:
// 1. Two-leg outbound: Steven's phone answers → connects to seller (single `to` param)
// 2. Inbound to 855 marketing number → simultaneous ring to Steven's two cells (`numbers` param, comma-separated)
serve(async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";

  // Inbound simultaneous ring — multiple numbers comma-separated
  const numbers = url.searchParams.get("numbers");
  if (numbers) {
    const targets = numbers.split(",").filter((n) => n.match(/^\+1\d{10}$/));
    if (targets.length === 0) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unable to connect. Goodbye.</Say></Response>`,
        { headers: { "Content-Type": "application/xml" } }
      );
    }
    const numberTags = targets.map((n) => `    <Number>${n}</Number>`).join("\n");
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${from}" timeout="30">
${numberTags}
  </Dial>
</Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
  }

  // Single outbound leg — connect to seller
  const to = url.searchParams.get("to") ?? "";
  if (!to.match(/^\+1\d{10}$/)) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid number. Goodbye.</Say></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting to seller now.</Say>
  <Dial callerId="${from}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
});
