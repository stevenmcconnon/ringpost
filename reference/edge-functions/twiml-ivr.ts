import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NUMBER_855 = "+18557632274";
const NUMBER_816 = "+18164953325";
const CELLS = ["+15555550100"];

const CHIME_URL = "https://d2xsjlnny1fqip.cloudfront.net/assets/chime.mp3";

function say(text: string): string {
  return `<Say voice="Google.en-US-Neural2-G"><prosody pitch="+5st">${text}</prosody></Say>`;
}

async function sendVoicemailEmail(
  caller: string,
  context: string,
  transcription: string,
  recordingUrl: string,
) {
  const smtpHost = Deno.env.get("SMTP_ADDRESS") || "smtp.migadu.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USERNAME") || "admin@mavericksholdings.com";
  const smtpPass = Deno.env.get("SMTP_PASSWORD") || "";

  if (!smtpPass) {
    console.error("SMTP not configured — voicemail email skipped");
    return;
  }

  try {
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const client = new SMTPClient({
      connection: { hostname: smtpHost, port: smtpPort, tls: false, auth: { username: smtpUser, password: smtpPass } },
    });

    const subject = `📞 Voicemail from ${caller}${context ? ` — ${context}` : ""}`;
    const body = [
      `Caller: ${caller}`,
      context ? `Context: ${context}` : "",
      `Time: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PT`,
      "",
      "Transcription:",
      transcription || "(No transcription — check Twilio console for audio)",
      "",
      recordingUrl ? `Recording URL: ${recordingUrl}.mp3` : "",
      "Listen at: https://console.twilio.com/us1/monitor/logs/recordings",
    ].filter(Boolean).join("\n");

    await client.send({ from: smtpUser, to: "steve@mavericksholdings.com", subject, content: body });
    await client.close();
    console.log(`Voicemail email sent for ${caller}`);
  } catch (err) {
    console.error("Voicemail email error:", err);
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const number = url.searchParams.get("number") ?? "855";
  const step = url.searchParams.get("step") ?? "initial";

  // Parse Twilio params (POST body is form-urlencoded)
  const params: Record<string, string> = {};
  if (req.method === "POST") {
    try {
      const text = await req.text();
      for (const [k, v] of new URLSearchParams(text)) params[k] = v;
    } catch { /* ignore */ }
  }
  // URL params as fallback (Twilio also sends some in query string)
  for (const [k, v] of url.searchParams) {
    if (!params[k]) params[k] = v;
  }

  const callerNumber = params.From ?? params.Caller ?? "Unknown";
  const digits = params.Digits ?? "";
  const dialCallStatus = params.DialCallStatus ?? "";
  const recordingUrl = params.RecordingUrl ?? "";
  const transcriptionText = params.TranscriptionText ?? "";
  const transcriptionStatus = params.TranscriptionStatus ?? "";
  const digitContext = params.digit_context ?? "";

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const supabaseUrl = "https://supabase.mavericksholdings.com";
  const base = `${supabaseUrl}/functions/v1/twiml-ivr`;
  const callerID = number === "816" ? NUMBER_816 : NUMBER_855;

  // XML-safe callback URL builder (for use inside TwiML)
  function cb(s: string, extra = ""): string {
    return `${base}?apikey=${encodeURIComponent(anonKey)}&amp;number=${number}&amp;step=${s}${extra}`;
  }

  // Plain URL builder (for use in REST API calls, not XML)
  function apiUrl(s: string, extra = ""): string {
    return `${base}?apikey=${encodeURIComponent(anonKey)}&number=${number}&step=${s}${extra}`;
  }

  function xml(twiml: string): Response {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${twiml}`, {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // ── Transcription callback (async from Twilio) ───────────────────────────
  if (step === "transcription") {
    if (transcriptionStatus === "completed" || transcriptionText) {
      await sendVoicemailEmail(callerNumber, digitContext, transcriptionText, recordingUrl);
    }
    return xml("<Response></Response>");
  }

  // ── Voicemail ────────────────────────────────────────────────────────────
  if (step === "voicemail") {
    const tcbExtra = digitContext
      ? `&amp;digit_context=${encodeURIComponent(digitContext)}`
      : (dialCallStatus ? `&amp;digit_context=${encodeURIComponent("Missed call")}` : "");
    return xml(`<Response>
  ${say("We're sorry we missed you! Please leave your name, number, and property address after the beep and we'll get right back to you.")}
  <Record maxLength="120" transcribe="true" transcribeCallback="${base}?apikey=${encodeURIComponent(anonKey)}&amp;number=${number}&amp;step=transcription${tcbExtra}" playBeep="true" />
  ${say("Thank you so much — we'll be in touch soon. Have a great day!")}
</Response>`);
  }

  // ── Conference join (Steven's leg — called via REST API) ─────────────────
  if (step === "conference") {
    const conf = url.searchParams.get("conf") ?? "";
    return xml(`<Response>
  <Conference beep="false" endConferenceOnExit="true" startConferenceOnEnter="true">
    ${conf}
  </Conference>
</Response>`);
  }

  // ── No-answer handler (statusCallback from outbound call to Steven) ─────
  if (step === "no-answer") {
    const callStatus = params.CallStatus ?? "";
    // Only redirect to voicemail if Steven didn't answer
    if (callStatus === "completed") {
      return xml("<Response></Response>");
    }
    const parentCall = url.searchParams.get("parent_call") ?? params.parent_call ?? "";
    if (parentCall && twilioSid && twilioToken) {
      const vmUrl = apiUrl("voicemail", `&digit_context=${encodeURIComponent(digitContext)}`);
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls/${parentCall}.json`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Url: vmUrl, Method: "GET" }),
        });
        console.log(`Redirected caller ${parentCall} to voicemail (status: ${callStatus})`);
      } catch (err) {
        console.error("Failed to redirect caller to voicemail:", err);
      }
    }
    return xml("<Response></Response>");
  }

  // ── 855 digit routing ─────────────────────────────────────────────────────
  if (step === "route" && number === "855") {
    let context = "";
    switch (digits) {
      case "1": context = "Seller — wants to sell their house"; break;
      case "2": context = "Buyer/renter — wants to buy or rent a home"; break;
      case "3": break; // voicemail
      default: break;
    }
    if (!context) {
      return xml(`<Response>
  <Redirect method="GET">${cb("voicemail")}</Redirect>
</Response>`);
    }

    // Conference-based call with hold music
    const confName = `call-${params.CallSid || Date.now()}`;
    const connectUrl = apiUrl("conference", `&conf=${encodeURIComponent(confName)}`);
    const statusCbUrl = apiUrl("no-answer", `&parent_call=${params.CallSid || ""}&digit_context=${encodeURIComponent(context)}`);

    // Call Steven via Twilio REST API (fire-and-forget — don't block TwiML response)
    if (twilioSid && twilioToken) {
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: CELLS[0],
          From: callerID,
          Url: connectUrl,
          Timeout: "14",
          StatusCallback: statusCbUrl,
          StatusCallbackEvent: "completed",
        }),
      }).catch(err => console.error("Failed to initiate call to Steven:", err));
    }

    // Put caller in conference with hold music
    return xml(`<Response>
  ${say("One moment while we connect you.")}
  <Dial>
    <Conference beep="false" waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.guitars" waitMethod="GET" startConferenceOnEnter="false" endConferenceOnExit="true">
      ${confName}
    </Conference>
  </Dial>
</Response>`);
  }

  // ── 816 inbound (warm callback) ───────────────────────────────────────────
  if (number === "816") {
    // Conference-based call with hold music for 816 too
    const confName = `call-${params.CallSid || Date.now()}`;
    const connectUrl = apiUrl("conference", `&conf=${encodeURIComponent(confName)}`);
    const statusCbUrl = apiUrl("no-answer", `&parent_call=${params.CallSid || ""}&digit_context=${encodeURIComponent("Callback from 816")}`);

    if (twilioSid && twilioToken) {
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: CELLS[0],
          From: callerID,
          Url: connectUrl,
          Timeout: "14",
          StatusCallback: statusCbUrl,
          StatusCallbackEvent: "completed",
        }),
      }).catch(err => console.error("Failed to initiate 816 call to Steven:", err));
    }

    return xml(`<Response>
  ${say("Hey! You've reached Steven with Mavericks Holdings — I was just reaching out about your property. Hold on one moment and I'll be right with you.")}
  <Dial>
    <Conference beep="false" waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.guitars" waitMethod="GET" startConferenceOnEnter="false" endConferenceOnExit="true">
      ${confName}
    </Conference>
  </Dial>
</Response>`);
  }

  // ── 855 initial IVR ───────────────────────────────────────────────────────
  return xml(`<Response>
  <Gather numDigits="1" action="${cb("route")}" method="POST" timeout="8">
    <Play>${CHIME_URL}</Play>
    ${say("You've reached Mavericks Holdings.<break time='400ms'/> We work directly with homeowners to create custom offers — cash, flexible terms, any condition.<break time='600ms'/> Press 1 to <emphasis level='strong'>sell</emphasis> your house.<break time='500ms'/> Press 2 to buy or rent a home.<break time='500ms'/> Or press 3 to leave a voicemail.")}
  </Gather>
  <Gather numDigits="1" action="${cb("route")}" method="POST" timeout="8">
    ${say("Sorry about that.<break time='400ms'/> Press 1 to <emphasis level='strong'>sell</emphasis> your house.<break time='500ms'/> Press 2 to buy or rent a home.<break time='500ms'/> Or press 3 to leave a voicemail.")}
  </Gather>
  <Redirect method="GET">${cb("voicemail")}</Redirect>
</Response>`);
});
