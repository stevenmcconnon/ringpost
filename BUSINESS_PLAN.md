# RingPost — Business Plan

## The Idea

Sell the professional IVR + voicemail + call forwarding system that was built for Mavericks Holdings as a product for other small businesses. The system already works in production — it just needs to be made multi-tenant.

## Market

**Who buys this:**
- Solo entrepreneurs (realtors, contractors, lawyers, consultants)
- Small businesses with no receptionist
- Side hustlers who want to look professional
- Anyone who currently uses Grasshopper, OpenPhone, Google Voice, or just their personal cell

**Why they'd switch:**
- Cheaper than Grasshopper ($14-55/mo) and OpenPhone ($15-35/mo/user)
- Multi-level IVR that Grasshopper doesn't even offer
- Google Neural voice sounds better than robotic TTS
- Hold music instead of ringing
- Voicemail transcription emailed to them
- No per-user pricing — flat rate for the whole business

## Competitive Landscape (2026 pricing)

| Competitor | Price | IVR | Voicemail Transcription | Hold Music |
|---|---|---|---|---|
| Grasshopper | $14-55/mo | Single level | Yes | Basic |
| OpenPhone (Quo) | $15-35/mo/user | Business plan only | Yes | Basic |
| Google Voice | $10/mo/user | No | Yes | No |
| Nextiva | $25-45/mo/user | Yes | Yes | Yes |
| RingCentral | $30-45/mo/user | Yes | Yes | Yes |
| **RingPost** | **$19-29/mo flat** | **Multi-level** | **Yes + email** | **Custom music** |

## Pricing Strategy

- **Starter: $19/month** — 1 number, IVR, voicemail transcription, call forwarding to 1 phone
- **Pro: $29/month** — 1 number, IVR, voicemail transcription, forwarding to 3 phones (simultaneous ring), hold music, SIP softphone
- **Additional numbers: $9/month each**

No per-user pricing. No annual contracts. Cancel anytime.

## Revenue Targets

| Customers | Monthly Revenue | Monthly Cost | Monthly Profit |
|---|---|---|---|
| 10 | $190-290 | ~$50 | $140-240 |
| 30 | $570-870 | ~$150 | $420-720 |
| 50 | $950-1,450 | ~$250 | $700-1,200 |
| 100 | $1,900-2,900 | ~$500 | $1,400-2,400 |

30 customers at $29/mo = ~$720/month profit with minimal ongoing effort.

## What Needs to Be Built

### Phase 1: MVP (1-2 weeks)
- Multi-tenant Twilio subaccounts (each customer gets isolated)
- DB-driven IVR config (customer sets menu options, greetings, forwarding numbers)
- Stripe checkout for sign-up
- Simple admin dashboard to manage customers
- Landing page at ringpost.com (or similar domain)

### Phase 2: Self-Service (1-2 weeks)
- Customer portal: edit IVR menu, change forwarding number, view call logs
- Number porting (bring your own number)
- Custom hold music upload
- Usage dashboard (minutes, voicemails)

### Phase 3: Growth
- Referral program
- Affiliate/reseller program
- API for developers
- White-label option

## Go-to-Market

- Post in entrepreneur/small business subreddits
- Facebook groups for solopreneurs, realtors, contractors
- Product Hunt launch
- "Switch from Grasshopper and save 50%" comparison pages
- Google Ads for "cheap business phone system" keywords

## Technical Architecture

All runs on the existing Mavericks Holdings EC2 instance (or a dedicated one for isolation). Each customer gets:
- A Twilio subaccount (isolated billing, numbers, call logs)
- A row in the `customers` table with their IVR config as JSON
- Edge functions that read config from DB and generate TwiML dynamically

The IVR edge function already exists — it just needs to look up config by incoming number instead of being hardcoded.

## Open Questions

- Domain: ringpost.com? callpost.com? vonline.com? Check availability.
- Should this be a separate AWS account or run on the same EC2?
- Twilio subaccounts vs single account with number routing?
- Support model: email only? Chat? Phone? (ironic if a phone company doesn't answer their phone)
