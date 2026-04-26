import React from 'react';

interface LogoIconProps {
  className?: string;
  strokeWidth?: number;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className, strokeWidth = 3 }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Diamond */}
      <path 
        d="M50 5L95 50L50 95L5 50Z" 
        fill="currentColor" 
        className="text-[#F59E0B]"
        stroke="#EF4444"
        strokeWidth="1"
      />
      
      {/* Red Ganesha-style Geometric Pattern */}
      <g stroke="#EF4444" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* Central Vertical Trunk Structure */}
        <path d="M42 30V70C42 78 58 78 58 70V30" />
        <path d="M42 30H58" />
        
        {/* Radial Grid Lines (Ears/Structure) */}
        <path d="M42 35L22 25" />
        <path d="M58 35L78 25" />
        
        <path d="M42 45L18 45" />
        <path d="M58 45L82 45" />
        
        <path d="M42 55L22 65" />
        <path d="M58 55L78 65" />
        
        <path d="M42 65L30 80" />
        <path d="M58 65L70 80" />

        {/* Eyes */}
        <circle cx="47" cy="40" r="1.5" fill="#EF4444" stroke="none" />
        <circle cx="53" cy="40" r="1.5" fill="#EF4444" stroke="none" />
        
        {/* Top Dot (Bindi) */}
        <circle cx="50" cy="15" r="1" fill="#EF4444" stroke="none" />
      </g>
    </svg>
  );
};
