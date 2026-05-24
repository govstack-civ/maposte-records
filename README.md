# MaPoste — Portail National des Relevés Académiques

Digital academic records retrieval service prototype for Côte d'Ivoire, built with Next.js 16 + Supabase.

## Setup (required before first use)

### 1. Verify Supabase credentials

Go to [app.supabase.com](https://app.supabase.com) → your project → **Settings → API**.

Copy the **Project URL** and **anon public** key and update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Run the database schema

In your Supabase dashboard → **SQL Editor**, paste and run the contents of:

```
supabase/schema.sql
```

This creates all tables, enables RLS policies, and inserts the test citizen seed data.

### 3. Seed test data (alternative)

After running the schema SQL, you can also seed via the API route:

```
http://localhost:3000/api/setup
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Test credentials

| Field | Value |
|-------|-------|
| NNI | `10294857362` |
| Name | Awa Koné |
| OTP | Any 6-digit code (e.g. `123456`) |
| PIN | Any 4–6 digit code |

---

## Application flows

| Route | Flow |
|-------|------|
| `/` | Landing — SMS notification simulation |
| `/eligibility` | NNI lookup and eligibility check |
| `/auth` | OTP authentication |
| `/consent` | Institution consent form |
| `/retrieve` | Record retrieval progress + review |
| `/payment` | Payment method + PIN |
| `/credentials` | E-signature + credential issuance |
| `/share` | Share credential with recipient |
| `/locker` | Digital locker dashboard |
| `/verify/[token]` | Public credential verification |
| `/api/setup` | Seed test data (GET) |

---

## Tech stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- **Backend:** Supabase (PostgreSQL + RLS)
- **PDF:** jsPDF
- **QR:** qrcode.react
- **i18n:** Custom EN/FR string system (`src/lib/i18n.ts`)

---

## Language

Toggle EN/FR using the top-right language switch on every screen.  
Default: French. Preference stored in `localStorage` key `maposte_lang`.

---

*Powered by GovStack · République de Côte d'Ivoire*
