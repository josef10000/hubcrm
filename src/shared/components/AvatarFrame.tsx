import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';

interface AvatarFrameProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulseStatus?: 'active' | 'paused' | 'none';
  frame?: string;
}

export default function AvatarFrame({ children, size = 'md', pulseStatus = 'none', frame: propFrame }: AvatarFrameProps) {
  const { userProfile } = useAuth();
  const frame = propFrame || userProfile?.avatarFrame || 'none';

  if (frame === 'none' && pulseStatus === 'none') return <>{children}</>;

  const sizeClasses = {
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-1',
    xl: 'p-1.5'
  };

  const getFrameStyles = () => {
    let styles = '';
    
    if (frame === 'none') {
      if (pulseStatus === 'active') {
        styles = 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
      } else if (pulseStatus === 'paused') {
        styles = 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]';
      }
    } else {
      switch (frame) {
        case 'neon':
          styles = 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
          break;
        case 'gold':
          styles = 'bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
          break;
        case 'cyberpunk':
          styles = 'bg-gradient-to-br from-cyan-400 to-pink-500 shadow-[0_0_15px_rgba(0,243,255,0.6)]';
          break;
        case 'floral':
          styles = 'bg-gradient-to-br from-emerald-300 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-200/50';
          break;
        case 'ruby':
          styles = 'bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_0_12px_rgba(225,29,72,0.5)]';
          break;
        case 'ocean':
          styles = 'bg-gradient-to-bl from-blue-400 to-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.5)]';
          break;
        case 'dark':
          styles = 'bg-gradient-to-br from-gray-800 to-black border border-gray-600 shadow-[0_0_10px_rgba(255,255,255,0.1)]';
          break;
        case 'rainbow':
          styles = 'bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(255,255,255,0.3)]';
          break;
        case 'silver':
          styles = 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 shadow-[0_0_10px_rgba(209,213,219,0.6)] border border-gray-300';
          break;
      }

      if (pulseStatus === 'active') {
        styles += ' shadow-[0_0_22px_rgba(16,185,129,0.8)]';
      } else if (pulseStatus === 'paused') {
        styles += ' shadow-[0_0_22px_rgba(245,158,11,0.8)]';
      } else if (frame === 'rainbow') {
        styles += ' animate-pulse';
      }
    }

    return styles;
  };

  return (
    <div className={`rounded-full flex items-center justify-center overflow-visible ${sizeClasses[size]} ${getFrameStyles()}`}>
      <div className="bg-white dark:bg-gray-900 rounded-full w-full h-full overflow-hidden flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
