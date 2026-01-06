
// Phase 3-B: The GBC Sniper (Node.js Version)
// Logic: Probe GBC's "hidden" case URLs and extract defendant evidence links.

import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';

// The "Death Star" URL Pattern
const BASE_URL = 'http://gbcinternetenforcement.net';

// Known Targets (Probed via Browser Subagent)
// We will iterate around these "hot spots"
const PROBE_TARGETS = [
    { year: 24, number: 373, brand: 'Converse (Nike)' },     // Confirmed Live
    { year: 24, number: 695, brand: 'Nike (Projected)' },    // The user's target
    { year: 24, number: 5977, brand: 'Crye Precision' },
    { year: 24, number: 5979, brand: 'Unknown' }
];

async function probeTarget(target) {
    // Construct URL variations (GBC is inconsistent)
    // 1. http://gbcinternetenforcement.net/24-373/
    // 2. http://gbcinternetenforcement.net/24-cv-373/
    const variations = [
        `${BASE_URL}/${target.year}-${target.number}/`,
        `${BASE_URL}/${target.year}-cv-${target.number}/`,
        `${BASE_URL}/${target.year}-cv-${String(target.number).padStart(5, '0')}/`
    ];

    console.log(`\n[*] Targeting Case: 20${target.year}-cv-${target.number} (${target.brand})`);

    for (const url of variations) {
        console.log(`    -> Probing: ${url}`);
        const result = await checkUrl(url);

        if (result.success) {
            console.log(`    [+] HIT! Page is LIVE.`);
            analyzeContent(result.data, target);
            return; // Stop after first hit for this case
        } else {
            console.log(`       [x] Failed: ${result.status}`);
        }
    }
}

function checkUrl(urlStr) {
    return new Promise((resolve) => {
        const url = new URL(urlStr);
        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.get(urlStr, {
            rejectUnauthorized: false
        }, (res) => {
            // Handle HTTP 3xx Redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // console.log(`        -> Following Redirect: ${res.headers.location}`);
                return resolve(checkUrl(res.headers.location));
            }

            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ success: true, data: data }));
            } else {
                res.resume(); // Consume response to free memory
                resolve({ success: false, status: res.statusCode });
            }
        });

        req.on('error', (e) => resolve({ success: false, status: `Error: ${e.message}` }));
        req.end();
    });
}

function analyzeContent(html, target) {
    // 1. Look for SharePoint Links (The Vault)
    const sharePointRegex = /https:\/\/gbcnet-my\.sharepoint\.com[^\s"']+/gi;
    const sharePointLinks = html.match(sharePointRegex) || [];

    // 2. Look for PDF Links (Schedule A)
    // Pattern: href="..." ending in .pdf and containing 'Schedule' or 'Complaint'
    const pdfRegex = /href=["']([^"']+\.pdf)["']/gi;
    let pdfLinks = [];
    let match;
    while ((match = pdfRegex.exec(html)) !== null) {
        if (match[1].toLowerCase().includes('schedule') || match[1].toLowerCase().includes('complaint')) {
            pdfLinks.push(match[1]);
        }
    }

    if (sharePointLinks.length > 0) {
        console.log(`    [!!!] JACKPOT: Found SharePoint Evidence Vault!`);
        sharePointLinks.forEach(link => console.log(`        -> ${link}`));
    }

    if (pdfLinks.length > 0) {
        console.log(`    [+] Found Legal Documents:`);
        pdfLinks.forEach(link => console.log(`        -> ${link}`));
    }

    // In a real run, we would download the Excel here.
    // For now, we just log the "Hit".
}


// === ADVANCED MODE: Range Scanner ===
// Instead of hardcoded targets, we scan a range of potential cases.
// GBC cases are usually sequential.

const SCAN_YEAR = 25; // 2025
const START_ID = 1;
const END_ID = 50;   // Scan first 50 cases of 2025

async function runSniper() {
    console.log(`=== GBC SNIPER PROTOCOL INITIATED (Range Mode) ===`);
    console.log(`[*] Scanning Year: 20${SCAN_YEAR}`);
    console.log(`[*] Range: ${START_ID} to ${END_ID}`);

    for (let i = START_ID; i <= END_ID; i++) {
        const target = {
            year: SCAN_YEAR,
            number: i,
            brand: 'Unknown (Scanning)'
        };
        
        await probeTarget(target);
        
        // Polite delay to avoid IP ban
        // await new Promise(r => setTimeout(r, 500)); 
    }
}

runSniper();
