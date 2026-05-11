# Bianca Dispatch CRM MVP (Multi-Device Ready)

This app supports:
1. **GitHub Pages hosting** (no local storage on your computer beyond browser cache).
2. **Local mode** (optional, single device).
3. **Cloud sync mode** with a **new Supabase project** (optional multi-device live sync).

## Get a public GitHub link (recommended)

### 1) Create a new GitHub repository
- Go to GitHub and create a repo (example name: `bianca-dispatch-crm`).

### 2) Push this project to your repo
Run these commands in this project folder:

```bash
git init
git add .
git commit -m "Initial Bianca Dispatch CRM MVP"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

### 3) Enable GitHub Pages
- In GitHub repo: **Settings → Pages**
- Source: **GitHub Actions**
- The included workflow (`.github/workflows/deploy-pages.yml`) deploys automatically.

### 4) Open your dashboard link
After workflow succeeds, your link will be:

`https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/`

## Optional: Supabase free sync (phone/tablet/laptop)
Create a brand new Supabase project (isolated; won't affect existing projects), then run SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  affiliate_trip_id text,
  source_type text default 'affiliate',
  pickup_at timestamptz,
  pickup_address text,
  dropoff_address text,
  passenger_name text,
  passenger_phone text,
  job_type text,
  vehicle_class_requested text,
  status text default 'new',
  revenue numeric(10,2) default 0,
  other_costs numeric(10,2) default 0,
  special_instructions text,
  created_at timestamptz default now()
);

alter table trips enable row level security;
create policy "auth users can read trips" on trips for select to authenticated using (true);
create policy "auth users can insert trips" on trips for insert to authenticated with check (true);
create policy "auth users can update trips" on trips for update to authenticated using (true) with check (true);
create policy "auth users can delete trips" on trips for delete to authenticated using (true);
```

Then in app UI enter Supabase URL + anon key + email and click connect/login.

## Cost note
- GitHub Pages hosting: free
- Supabase free tier: free to start
- Suitable for MVP and 100–200 rides/month testing.
