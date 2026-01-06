-- Lawsuits Table (The Raw Intelligence)
-- Stores detailed case metadata fetched from CourtListener
-- Linked to 'keywords' table via brand_name

CREATE TABLE IF NOT EXISTS lawsuits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT NOT NULL UNIQUE,     -- e.g., "1:24-cv-12345"
    plaintiff TEXT,                       -- e.g., "Nike, Inc."
    brand_name TEXT,                      -- Extracted Brand, e.g., "Nike"
    court TEXT,                           -- e.g., "Illinois Northern District"
    filed_date DATE,
    pdf_url TEXT,                         -- Link to Complaint PDF
    risk_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Public Read)
ALTER TABLE lawsuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lawsuits" ON lawsuits FOR SELECT TO anon USING (true);
