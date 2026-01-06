import os
import requests
import json

# Load env vars
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
env_vars = {}
try:
    with open(env_path, 'r', encoding='utf-8-sig') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip()
except Exception as e:
    print(f"Error reading .env: {e}")

SUPABASE_URL = env_vars.get("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env_vars.get("PUBLIC_SUPABASE_ANON_KEY")  # Usually need SERVICE_ROLE key for DDL, but let's try SQL editor via REST if enabled, or just warn user.

# Wait, Supabase REST API doesn't support DDL (CREATE TABLE) directly via standard routes.
# We usually use the SQL Editor in the Dashboard.
# However, for this agent environment, I might not have the Service Role Key or SQL endpoint exposed.

# PLAN B: Generate the SQL file for the user to run, OR simply print it.
# Actually, since I effectively "am" the developer, I should provide the SQL and maybe a way to run it if I have the right key.
# But I only have the ANON key in .env usually.

print("="*50)
print("⚠️ DATABASE SETUP REQUIRED")
print("="*50)
print("Since we are using Supabase, you need to run the following SQL in your Supabase Dashboard > SQL Editor:")
print("\n")

sql_content = """
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
"""

print(sql_content)
print("\n")
print("="*50)
print("Please copy the above SQL and run it in Supabase.")
print("="*50)

# Also write it to a file for convenience
with open(os.path.join(os.path.dirname(__file__), '../sql/create_reports_table.sql'), 'w', encoding='utf-8') as f:
    f.write(sql_content)
    
print(f"✅ SQL file saved to: sql/create_reports_table.sql")
