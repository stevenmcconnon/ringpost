# Reference Code

These files are copied from the Mavericks Holdings real estate app as reference implementations. They work in production today. The RingPost product would make these multi-tenant and configurable per customer.

## Files

| File | What it does | What needs to change for RingPost |
|---|---|---|
| `twiml-ivr.ts` | IVR phone menu — 3 options, Google Neural voice, conference-based hold music, voicemail with transcription + email | Menu options, greeting text, forwarding numbers, and hold music need to be DB-driven per customer instead of hardcoded |
| `twiml-connect.ts` | Connects two call legs (caller ↔ Steven's phone) | Needs to look up forwarding number from customer config |
| `twiml-sip-outbound.ts` | SIP softphone outbound calling with caller ID | Needs per-customer SIP domain + caller ID |
| `make-call.ts` | Two-leg outbound: app calls Steven's phone first, then connects to the other party showing business number | Needs per-customer callback phone + caller ID |

## Tech Stack (from production)

- **Runtime:** Deno (Supabase Edge Functions)
- **Telephony:** Twilio (Voice, TwiML, Lookups, SMS)
- **TTS:** Google Neural voice (en-US-Neural2-G at +5st pitch)
- **Hold music:** Twilio's built-in guitars (`twimlets.com/holdmusic?Bucket=com.twilio.music.guitars`)
- **Voicemail:** Twilio `<Record>` with transcription callback → email via Migadu SMTP
- **Call routing:** Conference-based (caller in conference with hold music, REST API calls the business owner, owner joins conference)

## Key Design Decisions

1. **Conference-based calling** instead of simple `<Dial>` — avoids carrier voicemail interception issues. Caller hears hold music while the business owner's phone rings.
2. **14-second timeout** — shorter than carrier voicemail pickup (~25s), so Twilio gets control back for custom voicemail.
3. **Google Neural voice** — sounds professional, not robotic.
4. **Fire-and-forget REST API calls** — the TwiML response returns immediately, the outbound call to the business owner happens async via Twilio REST API.
