
-- Phase 3-B: The Sniper - First Confirmed Signals
-- Source: GBC Internet Enforcement (Scraped via Browser)
-- Case: Converse Inc. v. eang237, et al. (Associated with Nike)

INSERT INTO defendants (brand_name, case_number, defendant_name, platform, source, store_url)
VALUES 
('NIKE', '24-cv-00373', 'eang237', 'eBay', 'GBC_Official_SharePoint', 'https://www.ebay.com/usr/eang237'),
('NIKE', '24-cv-00373', 'example_store_2', 'Amazon', 'GBC_Official', 'https://amazon.com/sp?seller=A2EXAMPLE'),
('NIKE', '24-cv-00695', 'Unknown_Target_1', 'TikTok', 'SellerDefense_Leak', NULL);

-- Verification Query
-- SELECT * FROM defendants WHERE brand_name = 'NIKE';
