import { create } from 'zustand';
import { CallState } from '../types/call.types';

export const useCallStore = create<CallState>((set) => ({
  localStream: null,
  remoteStream: null,
  callStatus: 'idle',
  connectionState: 'new',
  callType: 'video',
  currentCallId: null,
  otherParticipant: null,
  isMuted: false,
  isVideoOff: false,
  isOverlayMinimized: false,

  setStreams: (local, remote) => set({ localStream: local, remoteStream: remote }),
  
  updateStatus: (status, callId = null) => set((state) => {
    const updates: Partial<CallState> = { callStatus: status };
    if (callId !== undefined) {
      updates.currentCallId = callId;
    }
    return updates;
  }),
  
  updateConnectionState: (connectionState) => set({ connectionState }),
  
  setOtherParticipant: (otherParticipant) => set({ otherParticipant }),
  
  toggleMute: () => set((state) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = state.isMuted; // Se estava mutado (isMuted = true), agora habilitamos a track (track.enabled = true)
      });
    }
    return { isMuted: !state.isMuted };
  }),
  
  toggleVideo: () => set((state) => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = state.isVideoOff; // Se o vídeo estava desligado (isVideoOff = true), agora habilitamos a track (track.enabled = true)
      });
    }
    return { isVideoOff: !state.isVideoOff };
  }),
  
  toggleMinimize: () => set((state) => ({ isOverlayMinimized: !state.isOverlayMinimized })),
  
  resetStore: () => set({
    localStream: null,
    remoteStream: null,
    callStatus: 'idle',
    connectionState: 'new',
    callType: 'video',
    currentCallId: null,
    otherParticipant: null,
    isMuted: false,
    isVideoOff: false,
    isOverlayMinimized: false,
  }),
}));
