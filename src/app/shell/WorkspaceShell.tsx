import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import ThemeEffects from '@shared/components/ThemeEffects';
import BirthdayCelebration from '@shared/components/BirthdayCelebration';
import { usePresence } from '@/hooks/usePresence';
import GlobalCallListener from '@/domains/chat/components/webrtc/GlobalCallListener';
import { CallOverlay } from '@/domains/chat/components/webrtc/CallOverlay';
import { MatchInviteListener } from '@/domains/arena/components/MatchInviteListener';
import { CommandPalette } from '@shared/components/CommandPalette';

interface WorkspaceShellProps {
  children: React.ReactNode;
  isBirthday: boolean;
}

/**
 * WorkspaceShell gerencia a estética visual e "casca" do workspace.
 * Inclui wallpapers, efeitos de partículas, luzes de fundo e hooks de presença.
 */
export function WorkspaceShell({ children, isBirthday }: WorkspaceShellProps) {
  const { user, userProfile } = useAuth();
  
  // Ativa o rastreamento de presença global
  usePresence();

  return (
    <div className="flex h-screen bg-[#030712] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      {/* Background Wallpaper Layer */}
      {userProfile?.wallpaperUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none mix-blend-overlay transition-all duration-1000"
          style={{ backgroundImage: `url(${userProfile.wallpaperUrl})` }}
        />
      )}

      {/* Modern Glassmorphism Background Accents */}
      <ThemeEffects />
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0"></div>

      {/* Birthday Overlay */}
      {isBirthday && <BirthdayCelebration uid={user?.uid} />}

      {/* Application Content Area */}
      {children}

      {/* WebRTC Call Handling Infrastructure */}
      <GlobalCallListener />
      <CallOverlay />

      {/* Hub Arena Match Invitation Listener */}
      <MatchInviteListener />

      {/* Global Shortcut Command Palette & Search */}
      <CommandPalette />
    </div>
  );
}
