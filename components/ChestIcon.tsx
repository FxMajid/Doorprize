import React from 'react';

interface ChestIconProps {
  isOpen: boolean;
  className?: string;
}

export const ChestIcon: React.FC<ChestIconProps> = ({ isOpen, className = "" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-2xl ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ perspective: "1000px" }}
    >
      {/* Back/Interior - Darker when open */}
      <path
        d="M10 40 L90 40 L90 85 C90 90 85 95 80 95 L20 95 C15 95 10 90 10 85 Z"
        fill={isOpen ? "#1a1a1a" : "#4a3b2a"}
      />
      
      {/* Gold Coins inside (only visible if open) */}
      {isOpen && (
        <g className="animate-pulse">
           <circle cx="30" cy="70" r="5" fill="#FFD700" />
           <circle cx="45" cy="75" r="5" fill="#FFD700" />
           <circle cx="60" cy="70" r="5" fill="#FFD700" />
           <circle cx="70" cy="80" r="5" fill="#FFA500" />
           <circle cx="25" cy="80" r="5" fill="#FFA500" />
        </g>
      )}

      {/* Lid Body */}
      <g 
        className={`${isOpen ? "animate-lid-open" : "transition-transform duration-500 ease-out"}`}
        style={{ transformOrigin: "50px 40px" }}
      >
         {/* Lid Top curve */}
        <path
          d="M10 40 C10 15 90 15 90 40 L90 40 L10 40 Z"
          fill="#5c4a35"
          stroke="#3e2f1f"
          strokeWidth="2"
        />
        {/* Lid Metal Band Vertical Center */}
        <path d="M45 18 L55 18 L55 40 L45 40 Z" fill="#DAA520" />
        
        {/* Lid Metal Trim */}
        <path d="M10 40 C10 15 90 15 90 40" stroke="#DAA520" strokeWidth="4" fill="none" />
      </g>

      {/* Main Box Body */}
      <path
        d="M10 40 L90 40 L90 85 C90 90 85 95 80 95 L20 95 C15 95 10 90 10 85 Z"
        fill="#5c4a35"
        stroke="#3e2f1f"
        strokeWidth="2"
        className={isOpen ? "hidden" : "block"} 
      />
      {/* Box Body (Front face - visible when closed or open, but if open, interior is behind it) */}
      <path
        d="M10 40 L90 40 L90 85 C90 90 85 95 80 95 L20 95 C15 95 10 90 10 85 Z"
        fill="url(#woodGradient)"
        className={isOpen ? "hidden" : ""}
      />
       {/* If open, we need just the front face rect basically */}
       {isOpen && (
          <path
          d="M10 40 L90 40 L90 85 C90 90 85 95 80 95 L20 95 C15 95 10 90 10 85 Z"
          fill="#5c4a35"
          className="opacity-0" /* Invisible hitbox helper/spacer */
        />
       )}
       
       {/* Lower Box Detail (Front) */}
       <g>
         <rect x="10" y="40" width="80" height="55" rx="5" fill="#5c4a35" />
         {/* Vertical Metal Bands */}
         <rect x="20" y="40" width="10" height="55" fill="#DAA520" />
         <rect x="70" y="40" width="10" height="55" fill="#DAA520" />
         {/* Horizontal band */}
         <rect x="10" y="55" width="80" height="8" fill="#DAA520" />
         
         {/* Lock */}
         <circle cx="50" cy="59" r="6" fill="#1a1a1a" />
         <path d="M47 62 L53 62 L50 70 Z" fill="#1a1a1a" />
         <circle cx="50" cy="59" r="4" fill="#FFD700" />
       </g>

      <defs>
        <linearGradient id="woodGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c4a35" />
          <stop offset="100%" stopColor="#3e2f1f" />
        </linearGradient>
      </defs>
    </svg>
  );
};