# RingPost

Professional virtual phone system for small businesses. IVR, voicemail with transcription, call forwarding, hold music — all powered by Twilio at a fraction of the cost of Grasshopper or OpenPhone.

## What It Does

- Professional IVR phone menu (Google Neural voice)
- Voicemail with automatic transcription + email delivery
- Call forwarding to any phone (cell, landline, SIP)
- Conference-based hold music (callers hear music, not ringing)
- Two-leg outbound calling (show business number on caller ID)
- SIP softphone support (Acrobits Groundwire, etc.)
- Toll-free or local number options

## Market Comparison

| Feature | RingPost | Grasshopper | OpenPhone/Quo |
|---|---|---|---|
| IVR phone menu | Multi-level | Single level only | Business plan+ |
| Voicemail transcription | Included | Included | Included |
| Hold music | Custom | Basic | Basic |
| Call forwarding | Included | Included | Included |
| Outbound caller ID | Included | Included | Included |
| SIP softphone | Included | No | No |
| Price | **$19/mo** | $14-55/mo | $15-35/mo/user |
| Per-user pricing | No — flat rate | No | Yes (adds up) |

## Cost Structure

- Twilio number: $1-2/month per number
- Twilio minutes: ~$0.01/min
- EC2 hosting (shared): ~$2-3/customer at scale
- **Total cost per customer: ~$5/month**
- **Sell at: $19-29/month**
- **Margin: 70-80%**

## Status

Proof of concept running in production (Mavericks Holdings). Needs multi-tenant architecture before selling to others.

## TODO

- [ ] Multi-tenant config (DB-driven IVR per customer)
- [ ] Customer onboarding flow (pick number, set up IVR menu, set forwarding)
- [ ] Stripe billing integration
- [ ] Admin dashboard (manage customers, view usage)
- [ ] Customer self-service portal (edit IVR, change forwarding number)
- [ ] Marketing site / landing page
