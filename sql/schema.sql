-- GRICH Database Schema V1.0
-- Target: Supabase / PostgreSQL

-- 1. 关键词库 (The Seed)
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT UNIQUE NOT NULL,      -- 品牌名 (唯一索引)
    industry TEXT,                        -- 行业 (如 E-commerce, Tech)
    status TEXT DEFAULT 'pending',         -- 状态 (pending, crawled, failed)
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lawsuit_count INTEGER DEFAULT 0,       -- 相关诉讼数量
    source_url TEXT                        -- 来源链接 (如 CourtListener 链接)
);

-- 2. 报告缓存表 (The Brain Cache)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id),
    brand_name TEXT NOT NULL,
    summary TEXT,                         -- AI 生成的简要分析
    full_content JSONB,                   -- 完整的 AI 报告数据
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    is_premium BOOLEAN DEFAULT FALSE,      -- 是否已支付解锁
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 支付订单记录 (The Harvest)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE,                 -- LemonSqueezy/Stripe 订单 ID
    email TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以优化搜索性能
CREATE INDEX idx_keywords_brand ON keywords(brand_name);
CREATE INDEX idx_reports_brand ON reports(brand_name);
