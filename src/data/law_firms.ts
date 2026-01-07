export interface LawFirmProfile {
    id: string;
    name: string;
    aka: string[]; // Common aliases
    reputation_score: number; // 0-10 (10 = Most Aggressive)
    avg_settlement_cost: string;
    avg_freeze_duration: string;
    notoriety_level: "EXTREME" | "HIGH" | "MODERATE";
    description: string;
    tactics: string[];
}

export const LAW_FIRMS: LawFirmProfile[] = [
    {
        id: "gbc",
        name: "Greer, Burns & Crain (GBC)",
        aka: ["GBC", "Greer Burns"],
        reputation_score: 9.8,
        avg_settlement_cost: "$15,000 - $200,000",
        avg_freeze_duration: "35 Days",
        notoriety_level: "EXTREME",
        description: "The most aggressive IP enforcement firm in the US. Known for the 'Schedule A' scheme, filing thousands of cases annually against generic online sellers. Zero tolerance for negotiation without substantial payment.",
        tactics: ["Secret TRO Filing", "PayPal Asset Freeze", "Default Judgment Strategy"]
    },
    {
        id: "keith",
        name: "Keith Vogt, Ltd.",
        aka: ["Keith", "Vogt"],
        reputation_score: 9.2,
        avg_settlement_cost: "$5,000 - $50,000",
        avg_freeze_duration: "21 Days",
        notoriety_level: "HIGH",
        description: "Specializes in high-volume copyright and trademark litigation. Often represents artist brands. Uses automated scripts to scrape marketplaces like eBay and Etsy.",
        tactics: ["Marketplace Takedown", "AliExpress Account Freeze", "Copyright Image Matching"]
    },
    {
        id: "hsp",
        name: "Hughes Socol Piers Resnick & Dym, Ltd. (HSP)",
        aka: ["HSP", "Hughes Socol"],
        reputation_score: 8.9,
        avg_settlement_cost: "$8,000 - $80,000",
        avg_freeze_duration: "28 Days",
        notoriety_level: "HIGH",
        description: "Formerly associated with GBC partners. Operates with similar efficiency but tends to target larger storefronts on Amazon and Walmart. Known for 'catch-all' trademark filings.",
        tactics: ["Amazon Store Suspension", "TRO Extension", "Settlement Factory Model"]
    },
    {
        id: "ams",
        name: "AM Sullivan Law, LLC",
        aka: ["AMS", "Sullivan"],
        reputation_score: 8.5,
        avg_settlement_cost: "$3,000 - $30,000",
        avg_freeze_duration: "14 Days",
        notoriety_level: "MODERATE",
        description: "Active in N.D. Illinois. Focuses on smaller bands and anime franchises. Generally more communicative than GBC but still relies on the asset freeze pressure tactic.",
        tactics: ["Quick Settlement Offers", "Pre-suit Negotiation", "Domain Seizure"]
    },
    {
        id: "generic",
        name: "Unknown IP Enforcement Counsel",
        aka: ["John Doe Firm"],
        reputation_score: 7.0,
        avg_settlement_cost: "$5,000 (Est.)",
        avg_freeze_duration: "Unknown",
        notoriety_level: "MODERATE",
        description: "A detected legal entity specializing in intellectual property enforcement. Specific firm markers are currently being analyzed by the GRICH system.",
        tactics: ["Cease & Desist", "Platform Reporting"]
    }
];

export const getRandomFirm = (): LawFirmProfile => {
    // Weighted random? Or simple random for now.
    // GBC is the most common, so let's weigh it slightly if we wanted, but random is fine for variety.
    return LAW_FIRMS[Math.floor(Math.random() * (LAW_FIRMS.length - 1))]; // Exclude generic from random picks usually
};

export const getFirmById = (id: string): LawFirmProfile => {
    return LAW_FIRMS.find(f => f.id === id) || LAW_FIRMS[LAW_FIRMS.length - 1];
};
