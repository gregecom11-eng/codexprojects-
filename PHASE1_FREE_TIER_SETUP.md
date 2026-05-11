# Bianca Dispatch CRM — Phase 1 (Free-Tier Setup)

## Goal
Launch a mobile-friendly dispatch + CRM dashboard at near-zero monthly cost using free tiers.

## Stack
- **Frontend/API:** Next.js (App Router)
- **Hosting:** Vercel Hobby (Free)
- **Database/Auth:** Supabase Free (Postgres + Auth)
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts

## 1) Create accounts (free)
1. Create Supabase project.
2. Create Vercel account and connect GitHub repo.

## 2) Bootstrap app
```bash
npx create-next-app@latest bianca-dispatch-crm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd bianca-dispatch-crm
npm i @supabase/supabase-js recharts zod date-fns
```

## 3) Environment variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4) Database schema (run in Supabase SQL editor)
```sql
create table if not exists affiliate_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  payment_terms text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  unit_number text,
  vehicle_type text not null check (vehicle_type in ('sedan','suv','sprinter')),
  plate text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  affiliate_partner_id uuid references affiliate_partners(id),
  affiliate_trip_id text,
  source_type text not null default 'affiliate' check (source_type in ('affiliate','direct','referred_out')),

  pickup_at timestamptz not null,
  pickup_address text not null,
  dropoff_address text not null,
  passenger_name text,
  passenger_phone text,
  passenger_count int,
  job_type text check (job_type in ('hourly','point_to_point','city_to_city')),
  vehicle_class_requested text,
  special_instructions text,

  assigned_driver_id uuid references drivers(id),
  assigned_vehicle_id uuid references vehicles(id),
  status text not null default 'new' check (status in ('new','assigned','en_route','on_trip','completed','cancelled','no_show')),

  revenue numeric(10,2) not null default 0,
  driver_pay numeric(10,2) not null default 0,
  tolls numeric(10,2) not null default 0,
  parking numeric(10,2) not null default 0,
  other_costs numeric(10,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view trip_profit_v as
select
  t.*,
  (t.driver_pay + t.tolls + t.parking + t.other_costs) as total_cost,
  (t.revenue - (t.driver_pay + t.tolls + t.parking + t.other_costs)) as profit,
  case
    when t.revenue > 0 then round(((t.revenue - (t.driver_pay + t.tolls + t.parking + t.other_costs)) / t.revenue) * 100, 2)
    else 0
  end as margin_pct
from trips t;
```

## 5) MVP pages
- `/dashboard` — KPI cards + today trips
- `/dispatch` — daily dispatch board
- `/trips/new` — quick add form
- `/trips/import` — paste affiliate details parser
- `/trips/[id]` — trip details + assignment + costs

## 6) Affiliate text parser rules (Phase 1)
Support these keys from pasted text:
- `Details for` → affiliate_trip_id
- `PU Date` + `PU Time` → pickup_at
- `Passenger Name` / `Passenger Mobile`
- `Vehicle Type`
- `Job Type`
- `Pick-Up Information` / pickup address lines
- `Drop-Off Information` / dropoff address lines
- `Special PU Instructions`

## 7) Cost controls
- Stay on Vercel Hobby + Supabase Free while volume is low.
- Do **not** add paid SMS/maps/OCR in Phase 1.
- Use text paste parser first; OCR later if needed.

## 8) Phase 1 acceptance criteria
- Bianca can create a trip in < 60 seconds on phone.
- Bianca can assign driver + vehicle and update status live.
- Karim can see daily revenue, cost, and profit.
- Affiliate rides can be filtered and reported separately.
