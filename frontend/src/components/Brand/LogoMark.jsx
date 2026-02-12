import React from 'react';

const LogoMark = ({ className = 'w-9 h-9' }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 220 220"
            role="img"
            aria-label="FlowSuiteCrm funnel icon with leads"
            className={className}
        >
            <defs>
                <linearGradient id="fsGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2563EB" />
                    <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>

                <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0B1220" floodOpacity="0.25" />
                </filter>
            </defs>

            <rect x="24" y="24" width="172" height="172" rx="44" fill="#0B1220" />
            <rect x="40" y="40" width="140" height="140" rx="36" fill="none" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="2" />

            <g fill="none" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round">
                <path d="M66 54 C72 60 80 66 88 72" />
                <path d="M110 48 C110 56 110 64 110 72" />
                <path d="M154 54 C148 60 140 66 132 72" />
                <path d="M88 48 C96 56 102 62 106 70" />
                <path d="M132 48 C124 56 118 62 114 70" />
            </g>

            <g filter="url(#soft)">
                <circle cx="66" cy="54" r="6" fill="#22C55E" />
                <circle cx="88" cy="48" r="5.5" fill="#22C55E" opacity="0.92" />
                <circle cx="110" cy="48" r="6.2" fill="#22C55E" />
                <circle cx="132" cy="48" r="5.5" fill="#22C55E" opacity="0.92" />
                <circle cx="154" cy="54" r="6" fill="#22C55E" />
            </g>

            <path
                d="
    M56 72
    H164
    Q170 72 166 78
    L132 114
    Q128 119 128 126
    V158
    Q128 166 120 166
    H100
    Q92 166 92 158
    V126
    Q92 119 88 114
    L54 78
    Q50 72 56 72
    Z"
                fill="url(#fsGrad)"
            />

            <path
                d="
    M56 72
    H164
    Q170 72 166 78
    L132 114
    Q128 119 128 126
    V158
    Q128 166 120 166
    H100
    Q92 166 92 158
    V126
    Q92 119 88 114
    L54 78
    Q50 72 56 72
    Z"
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.12"
                strokeWidth="2"
                strokeLinejoin="round"
            />

            <circle cx="110" cy="172" r="6.5" fill="#22C55E" opacity="0.95" />
        </svg>
    );
};

export default LogoMark;
