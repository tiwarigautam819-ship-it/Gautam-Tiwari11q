import React from 'react';

interface CollegeEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CollegeEmblem: React.FC<CollegeEmblemProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${dim} ${className}`}>
      <svg
        viewBox="0 0 160 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Outer Shield with Gold Gradient */}
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="50%" stopColor="#172554" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>
        </defs>

        {/* Shield Outer Golden Border */}
        <path
          d="M80 6 C126 6 150 18 150 48 C150 110 116 154 80 174 C44 154 10 110 10 48 C10 18 34 6 80 6 Z"
          fill="url(#goldGrad)"
          stroke="#A16207"
          strokeWidth="3"
        />

        {/* Shield Inner Royal Blue Body */}
        <path
          d="M80 16 C120 16 140 26 140 52 C140 104 110 144 80 162 C50 144 20 104 20 52 C20 26 40 16 80 16 Z"
          fill="url(#blueGrad)"
          stroke="#FACC15"
          strokeWidth="2"
        />

        {/* Sanskrit Motto Arc: "ज्ञानं परमं ध्येयम्" */}
        <path
          id="mottoCurve"
          d="M36 50 C60 36 100 36 124 50"
          fill="none"
        />
        <text fontSize="8.5" fill="#FDE047" fontWeight="bold" textAnchor="middle">
          <textPath href="#mottoCurve" startOffset="50%">
            ज्ञानं परमं बलम्
          </textPath>
        </text>

        {/* Golden Lamp of Knowledge / Diya Pedestal */}
        <path
          d="M74 102 L86 102 L84 112 L76 112 Z"
          fill="url(#goldGrad)"
        />
        <path
          d="M62 112 L98 112 L94 118 L66 118 Z"
          fill="url(#goldGrad)"
        />
        <ellipse cx="80" cy="119" rx="20" ry="3" fill="#CA8A04" />

        {/* Diya Bowl */}
        <path
          d="M58 96 C58 104 70 106 80 106 C90 106 102 104 102 96 C102 92 88 94 80 94 C72 94 58 92 58 96 Z"
          fill="url(#goldGrad)"
        />
        <ellipse cx="80" cy="95" rx="22" ry="4" fill="#FEF08A" opacity="0.6" />

        {/* Diya Flame */}
        <path
          d="M80 62 C74 74 71 82 74 90 C76 94 84 94 86 90 C89 82 86 74 80 62 Z"
          fill="url(#flameGrad)"
        />
        <path
          d="M80 72 C77 78 76 83 78 87 C79 89 81 89 82 87 C84 83 83 78 80 72 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* Open Book of Education at Bottom */}
        <path
          d="M52 134 C64 130 76 134 80 138 C84 134 96 130 108 134 L108 142 C96 138 84 142 80 146 C76 142 64 138 52 142 Z"
          fill="url(#goldGrad)"
        />
        <line x1="80" y1="138" x2="80" y2="146" stroke="#854D0E" strokeWidth="1.5" />

        {/* Bottom Banner with "SINCE 1999" */}
        <rect x="48" y="148" width="64" height="12" rx="3" fill="#EAB308" stroke="#CA8A04" strokeWidth="1" />
        <text
          x="80"
          y="157"
          fontSize="7"
          fill="#1E3A8A"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.05em"
        >
          SINCE 1999
        </text>
      </svg>
    </div>
  );
};
