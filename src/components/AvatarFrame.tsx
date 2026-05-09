import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';

interface AvatarFrameProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function AvatarFrame({ children, size = 'md' }: AvatarFrameProps) {
  const { userProfile } = useAuth();
  const frame = userProfile?.avatarFrame || 'none';

  if (frame === 'none') return <>{children}</>;

  const sizeClasses = {
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-1',
    xl: 'p-1.5'
  };

  const getFrameStyles = () => {
    switch (frame) {
      case 'neon':
        return 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
      case 'gold':
        return 'bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
      case 'cyberpunk':
        return 'bg-gradient-to-br from-cyan-400 to-pink-500 shadow-[0_0_15px_rgba(0,243,255,0.6)]';
      case 'floral':
        return 'bg-gradient-to-br from-emerald-300 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-200/50';
      case 'ruby':
        return 'bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_0_12px_rgba(225,29,72,0.5)]';
      case 'ocean':
        return 'bg-gradient-to-bl from-blue-400 to-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.5)]';
      case 'dark':
        return 'bg-gradient-to-br from-gray-800 to-black border border-gray-600 shadow-[0_0_10px_rgba(255,255,255,0.1)]';
      case 'rainbow':
        return 'bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse';
      case 'silver':
        return 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 shadow-[0_0_10px_rgba(209,213,219,0.6)] border border-gray-300';
      default:
        return '';
    }
  };

  return (
    <div className={`rounded-full flex items-center justify-center overflow-visible ${sizeClasses[size]} ${getFrameStyles()}`}>
      <div className="bg-white dark:bg-gray-900 rounded-full w-full h-full overflow-hidden flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
