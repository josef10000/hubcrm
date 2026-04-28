import React from 'react';
import { useAuth } from '../contexts/AuthContext';

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
