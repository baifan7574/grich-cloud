'use client';

import React, { useState } from 'react';

export default function PaywallCard({ brand }: { brand: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUnlock = () => {
        setIsLoading(true);
        // Simulate payment/unlock process
        setTimeout(() => {
            alert("Payment gateway integration pending (LemonSqueezy)");
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="relative group overflow-hidden rounded-xl border border-red-500/30 bg-slate-900/50 p-8 backdrop-blur transition-all hover:border-red-500/50">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-6 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span className="text-sm font-bold tracking-widest uppercase">Restricted Intelligence</span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-4">
                        Unlock Full {brand} Defense Strategy
                    </h3>

                    <ul className="space-y-3 mb-8 text-slate-400">
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 mt-1">✓</span>
                            <span>Complete Plaintiff & Attorney Profile</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 mt-1">✓</span>
                            <span>Historical Settlement Rejection Data</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 mt-1">✓</span>
                            <span>AI-Generated Response Letter Template</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-4">
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-black text-white">$9.90</span>
                        <span className="text-sm text-slate-500 line-through">$49.00</span>
                        <span className="text-xs font-bold text-green-400 ml-2 animate-pulse">80% OFF</span>
                    </div>

                    <button
                        onClick={handleUnlock}
                        disabled={isLoading}
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group-hover:shadow-red-500/20"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                SECURING CONNECTION...
                            </>
                        ) : (
                            <>
                                <span>GET FULL REPORT</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-1">
                                    <path d="M5 12h14"></path>
                                    <path d="m12 5 7 7-7 7"></path>
                                </svg>
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-3">
                        Secure SSL Payment • 100% Money Back Guarantee
                    </p>
                </div>
            </div>
        </div>
    );
}
