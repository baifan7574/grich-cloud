'use client';

import React, { useEffect, useState } from 'react';

type RiskDashboardProps = {
    brand: string;
    initialScore: number;
    lawsuitCount: number;
};

export default function RiskDashboard({ brand, initialScore, lawsuitCount }: RiskDashboardProps) {
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Animation for score counting up
        const duration = 1500;
        const steps = 60;
        const interval = duration / steps;
        const stepValue = initialScore / steps;

        let current = 0;
        const timer = setInterval(() => {
            current += stepValue;
            if (current >= initialScore) {
                setScore(initialScore);
                clearInterval(timer);
            } else {
                setScore(Math.floor(current));
            }
        }, interval);

        return () => clearInterval(timer);
    }, [initialScore]);

    const getRiskColor = (val: number) => {
        if (val >= 80) return 'text-red-500';
        if (val >= 50) return 'text-orange-500';
        return 'text-green-500';
    };

    const getRiskLabel = (val: number) => {
        if (val >= 80) return 'EXTREME';
        if (val >= 50) return 'HIGH';
        return 'MODERATE';
    };

    return (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden">
            {/* Scanning Line Animation */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent h-[200%] w-full animate-scan pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {/* Score Circle */}
                <div className="col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-8 md:pb-0 md:pr-8">
                    <div className="relative h-40 w-40 flex items-center justify-center">
                        <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Background Circle */}
                            <circle
                                className="text-slate-800"
                                strokeWidth="8"
                                stroke="currentColor"
                                fill="transparent"
                                r="40"
                                cx="50"
                                cy="50"
                            />
                            {/* Progress Circle */}
                            <circle
                                className={getRiskColor(score)}
                                strokeWidth="8"
                                strokeDasharray={`${score * 2.51} 251.2`}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="40"
                                cx="50"
                                cy="50"
                                style={{ transition: 'stroke-dasharray 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className={`text-5xl font-black ${getRiskColor(score)} leading-none`}>
                                {score}
                            </span>
                            <span className="text-xs text-slate-500 uppercase font-bold mt-1">Risk Index</span>
                        </div>
                    </div>
                    <div className={`mt-4 px-4 py-1 rounded-full bg-slate-800 font-bold tracking-wider text-sm ${getRiskColor(score)}`}>
                        {getRiskLabel(score)} RISK
                    </div>
                </div>

                {/* Risk Details */}
                <div className="col-span-1 md:col-span-2 flex flex-col justify-center space-y-6">
                    <div>
                        <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                            Intelligence Summary for {brand}
                        </h2>
                        <p className="text-slate-200 leading-relaxed text-sm md:text-base">
                            Active surveillance has detected <span className="text-white font-bold bg-red-500/20 px-1 rounded">{lawsuitCount} confirmed lawsuit signals</span> associated with this keyword.
                            The risk level indicates a high probability of Temporary Restraining Order (TRO) execution and subsequent payment gateway freezes (Stripe/PayPal) within 48-72 hours.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-1">Detected Jurisdiction</h4>
                            <p className="text-white font-mono">N.D. Illinois (SAD Scheme)</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-1">Likely Plaintiff</h4>
                            <p className="text-white font-mono">{brand} IP Enforcement</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
