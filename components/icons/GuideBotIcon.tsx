import React from 'react';

export const GuideBotIcon: React.FC = () => (
  <svg viewBox="0 0 100 120" className="w-28 h-32 drop-shadow-lg">
    <g className="animate-float">
      {/* Antenna */}
      <line x1="50" y1="5" x2="50" y2="15" stroke="#4dd0e1" strokeWidth="3" />
      <circle cx="50" cy="5" r="4" fill="#ffab00" className="animate-pulse" />
      
      {/* Head */}
      <circle cx="50" cy="40" r="25" fill="#a5f3fc" />
      <circle cx="50" cy="40" r="26" fill="none" stroke="#4dd0e1" strokeWidth="3" />

      {/* Eyes */}
      <circle cx="40" cy="40" r="6" fill="white" />
      <circle cx="60" cy="40" r="6" fill="white" />
      <circle cx="42" cy="40" r="2" fill="#263238" />
      <circle cx="58" cy="40" r="2" fill="#263238" />

      {/* Mouth */}
      <path d="M 45 52 q 5 5 10 0" stroke="#263238" strokeWidth="2" fill="none" />

      {/* Body */}
      <rect x="30" y="65" width="40" height="40" rx="10" fill="#b0bec5" />
      <rect x="28" y="63" width="44" height="42" rx="12" fill="none" stroke="#78909c" strokeWidth="3" />
      
      {/* Hands */}
      <circle cx="20" cy="85" r="8" fill="#78909c" />
      <circle cx="80" cy="85" r="8" fill="#78909c" />
    </g>
    <style>{`
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0px); }
      }
      .animate-float {
        animation: float 3s ease-in-out infinite;
      }
    `}</style>
  </svg>
);
