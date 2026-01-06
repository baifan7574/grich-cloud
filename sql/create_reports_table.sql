
-- Create the table for AI reports
create table if not exists public.compliance_reports (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null,
  report_content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Add a unique constraint to prevent duplicate active reports for same brand
  -- (We will handle cache invalidation logic in code)
  constraint compliance_reports_brand_key unique (brand_name)
);

-- Enable Row Level Security (RLS)
alter table public.compliance_reports enable row level security;

-- Policy: Allow public read access (so frontend can fetch reports)
create policy "Allow public read access"
  on public.compliance_reports
  for select
  to anon
  using (true);

-- Policy: Allow authenticated (service role/scripts) insert/update
create policy "Allow insert for service role"
  on public.compliance_reports
  for insert
  to anon -- TEMPORARY for our Python script, ideally should be service_role
  with check (true);
  
create policy "Allow update for service role"
  on public.compliance_reports
  for update
  to anon
  using (true);
