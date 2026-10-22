import React from 'react';

interface DoodleProps {
  className?: string;
  color?: string;
  size?: number;
}

export const PeaceDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M23 15 C23 10 26 10 26 15 L26 25 C26 23 29 23 29 26 L29 18 C29 13 32 13 32 18 L32 28 C33 28 35 28 35 30 L35 22 C35 18 38 18 38 22 L38 33 C38 41 33 46 25 46 C18 46 14 41 14 34 L14 30 C14 26 18 26 18 29 L18 34" 
      stroke={color} 
      strokeWidth="1.75" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path d="M23 25 L23 34" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const PencilDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(35 25 25)">
      <rect x="20" y="10" width="10" height="24" rx="2" fill="#FFAEC8" stroke={color} strokeWidth="1.75" />
      <line x1="25" y1="10" x2="25" y2="34" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M20 34 L25 43 L30 34 Z" fill="#FAF8F5" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <polygon points="23,39 25,43 27,39" fill={color} />
      <rect x="20" y="6" width="10" height="4" rx="1.5" fill="#FAF8F5" stroke={color} strokeWidth="1.75" />
    </g>
  </svg>
);

export const SparkleDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2 C16 9.5 22.5 16 30 16 C22.5 16 16 22.5 16 30 C16 22.5 9.5 16 2 16 C9.5 16 16 9.5 16 2Z" 
      fill="#FFAEC8" 
      stroke={color} 
      strokeWidth="1.75" 
      strokeLinejoin="round" 
    />
  </svg>
);

export const SparkleCluster: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M20 6 C20 13 25 18 32 18 C25 18 20 23 20 30 C20 23 15 18 8 18 C15 18 20 13 20 6Z" 
      fill="#FFAEC8" 
      stroke={color} 
      strokeWidth="1.75" 
      strokeLinejoin="round" 
    />
    <path 
      d="M38 28 C38 32 41 35 45 35 C41 35 38 38 38 42 C38 38 35 35 31 35 C35 35 38 32 38 28Z" 
      fill="#FAF8F5" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinejoin="round" 
    />
    <circle cx="12" cy="38" r="2" fill={color} />
  </svg>
);

export const CurlyArrowDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15 48 C12 36 24 22 36 26 C44 29 42 42 30 42 C20 42 22 26 38 18 L50 16" 
      stroke={color} 
      strokeWidth="1.75" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path d="M42 12 L51 16 L46 25" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CursorPointerDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M14 6 L14 28 L20 22 L26 34 L30 32 L24 20 L31 19 Z" 
      fill="#FFAEC8" 
      stroke={color} 
      strokeWidth="1.75" 
      strokeLinejoin="round" 
    />
  </svg>
);

export const EnvelopeDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="44" height="34" rx="8" fill="#FFFDFB" stroke={color} strokeWidth="1.75" />
    <path d="M10 18 L30 34 L50 18" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="30" cy="34" r="6" fill="#FFAEC8" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const CassetteDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 70 50" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="6" width="60" height="38" rx="6" fill="#FFFDFB" stroke={color} strokeWidth="1.75" />
    <rect x="12" y="12" width="46" height="20" rx="3" fill="#FFAEC8" stroke={color} strokeWidth="1.5" />
    <rect x="20" y="16" width="30" height="12" rx="2" fill="#FAF8F5" stroke={color} strokeWidth="1.5" />
    <circle cx="26" cy="22" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    <circle cx="44" cy="22" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    <line x1="29.5" y1="22" x2="40.5" y2="22" stroke={color} strokeWidth="1.25" />
    <path d="M16 44 L20 38 L50 38 L54 44 Z" fill="#FFFDFB" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const VinylDoodle: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="25" r="22" fill="#2D160E" stroke={color} strokeWidth="1.5" />
    <circle cx="25" cy="25" r="16" fill="none" stroke="#FAF8F5" strokeWidth="0.8" strokeDasharray="4 2" opacity="0.3" />
    <circle cx="25" cy="25" r="11" fill="none" stroke="#FAF8F5" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.3" />
    <circle cx="25" cy="25" r="7" fill="#FFAEC8" stroke={color} strokeWidth="1.2" />
    <circle cx="25" cy="25" r="2" fill="#2D160E" />
  </svg>
);

export const InstagramIcon: React.FC<DoodleProps> = ({ className = '', color = '#2D160E', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const TapeStrip: React.FC<{ rotate?: number; width?: number; height?: number; className?: string }> = ({ 
  rotate = -2, 
  width = 65, 
  height = 18,
  className = ''
}) => (
  <div 
    className={`inline-block pointer-events-none select-none opacity-80 ${className}`}
    style={{
      width: `${width}px`,
      height: `${height}px`,
      transform: `rotate(${rotate}deg)`,
      backgroundColor: 'rgba(255, 235, 180, 0.75)',
      borderLeft: '1.5px dashed rgba(45, 22, 14, 0.2)',
      borderRight: '1.5px dashed rgba(45, 22, 14, 0.2)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}
  />
);
