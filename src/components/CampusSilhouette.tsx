import React from 'react';

export const CampusSilhouette: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full overflow-hidden pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-full opacity-25"
      >
        {/* Background Building Layer */}
        <rect x="0" y="210" width="1200" height="30" fill="#60A5FA" opacity="0.3" />
        
        {/* Main Central Academic Block */}
        {/* Central Dome */}
        <path d="M540 100 C540 60 660 60 660 100 Z" fill="#93C5FD" />
        <rect x="585" y="45" width="30" height="18" fill="#BFDBFE" />
        <line x1="600" y1="25" x2="600" y2="45" stroke="#BFDBFE" strokeWidth="3" />

        {/* Central Pediment */}
        <polygon points="510,120 600,80 690,120" fill="#93C5FD" />

        {/* Main Building Body */}
        <rect x="490" y="120" width="220" height="95" fill="#60A5FA" opacity="0.5" />
        
        {/* Pillars / Columns */}
        <rect x="520" y="125" width="10" height="85" fill="#BFDBFE" />
        <rect x="550" y="125" width="10" height="85" fill="#BFDBFE" />
        <rect x="580" y="125" width="10" height="85" fill="#BFDBFE" />
        <rect x="610" y="125" width="10" height="85" fill="#BFDBFE" />
        <rect x="640" y="125" width="10" height="85" fill="#BFDBFE" />
        <rect x="670" y="125" width="10" height="85" fill="#BFDBFE" />

        {/* Left Academic Wing */}
        <rect x="240" y="130" width="250" height="85" fill="#3B82F6" opacity="0.4" />
        <polygon points="240,130 365,100 490,130" fill="#60A5FA" opacity="0.4" />
        {/* Windows */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <React.Fragment key={`lw-${i}`}>
            <rect x={260 + i * 36} y="145" width="18" height="24" rx="2" fill="#BFDBFE" opacity="0.7" />
            <rect x={260 + i * 36} y="180" width="18" height="24" rx="2" fill="#BFDBFE" opacity="0.7" />
          </React.Fragment>
        ))}

        {/* Right Academic Wing */}
        <rect x="710" y="130" width="250" height="85" fill="#3B82F6" opacity="0.4" />
        <polygon points="710,130 835,100 960,130" fill="#60A5FA" opacity="0.4" />
        {/* Windows */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <React.Fragment key={`rw-${i}`}>
            <rect x={730 + i * 36} y="145" width="18" height="24" rx="2" fill="#BFDBFE" opacity="0.7" />
            <rect x={730 + i * 36} y="180" width="18" height="24" rx="2" fill="#BFDBFE" opacity="0.7" />
          </React.Fragment>
        ))}

        {/* Far Left Wing */}
        <rect x="40" y="150" width="200" height="65" fill="#2563EB" opacity="0.3" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={`flw-${i}`} x={60 + i * 42} y="165" width="20" height="30" rx="2" fill="#93C5FD" opacity="0.6" />
        ))}

        {/* Far Right Wing */}
        <rect x="960" y="150" width="200" height="65" fill="#2563EB" opacity="0.3" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={`frw-${i}`} x={980 + i * 42} y="165" width="20" height="30" rx="2" fill="#93C5FD" opacity="0.6" />
        ))}

        {/* Ground Floor Base */}
        <rect x="0" y="215" width="1200" height="25" fill="#1E3A8A" opacity="0.7" />
      </svg>
    </div>
  );
};
