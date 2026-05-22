export interface CallDocument {
  id?: string;
  callerId: string;
  calleeId: string;
  status: 'calling' | 'ringing' | 'answered' | 'rejected' | 'ended';
  createdAt: number;
  callType: 'video' | 'audio';
  offer?: {
    type: 'offer';
    sdp: string;
  };
  answer?: {
    type: 'answer';
    sdp: string;
  };
  callerCandidates: string[]; // ICE Candidates do emissor serializados em JSON
  calleeCandidates: string[]; // ICE Candidates do receptor serializados em JSON
}

export interface CallState {
  // Streams de mídia
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Status e metadados da chamada
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected';
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  callType: 'video' | 'audio';
  currentCallId: string | null;
  otherParticipant: {
    uid: string;
    name: string;
    avatarUrl?: string;
  } | null;

  // Estado físico de áudio e vídeo
  isMuted: boolean;
  isVideoOff: boolean;
  isOverlayMinimized: boolean;

  // Ações
  setStreams: (local: MediaStream | null, remote: MediaStream | null) => void;
  updateStatus: (status: CallState['callStatus'], callId?: string | null) => void;
  updateConnectionState: (state: CallState['connectionState']) => void;
  setOtherParticipant: (participant: CallState['otherParticipant']) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleMinimize: () => void;
  resetStore: () => void;
}
