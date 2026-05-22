import { useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  arrayUnion 
} from 'firebase/firestore';
import { useCallStore } from '../store/useCallStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { CallDocument } from '../types/call.types';

// Servidores STUN públicos do Google para computadores pessoais
const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Constraints de mídia flexíveis para evitar crashes em webcams legadas
const mediaConstraints = {
  audio: true,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 }
  }
};

// Sintetizador de áudio via AudioContext para evitar arquivos .mp3 estáticos
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  startRingtone() {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        
        // Primeiro tom harmonioso
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.frequency.setValueAtTime(480, now);
        osc1.frequency.setValueAtTime(620, now + 0.15);
        gain1.gain.setValueAtTime(0.0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc1.start(now);
        osc1.stop(now + 0.4);

        // Segundo tom harmonioso
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.frequency.setValueAtTime(480, now + 0.5);
        osc2.frequency.setValueAtTime(620, now + 0.65);
        gain2.gain.setValueAtTime(0.0, now + 0.5);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.55);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        osc2.start(now + 0.5);
        osc2.stop(now + 0.9);
      };

      playBeep();
      this.intervalId = setInterval(playBeep, 2000);
    } catch (e) {
      console.warn("AudioContext blocked or not supported", e);
    }
  }

  startCallingTone() {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.frequency.setValueAtTime(425, now); // Tom de linha telefonica padrao
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 0.95);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        
        osc.start(now);
        osc.stop(now + 1.0);
      };

      playBeep();
      this.intervalId = setInterval(playBeep, 3000);
    } catch (e) {
      console.warn("AudioContext blocked or not supported", e);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export function useWebRTC() {
  const { userProfile } = useAuth();
  const store = useCallStore();
  
  // Referencias persistentes nao reativas
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const firestoreUnsubscribe = useRef<(() => void) | null>(null);
  const soundSynth = useRef<SoundSynthesizer>(new SoundSynthesizer());
  const iceQueue = useRef<RTCIceCandidate[]>([]);
  const addedCandidates = useRef<Set<string>>(new Set());
  const connectionTimeout = useRef<any>(null);

  // Limpa tudo em caso de unmount
  useEffect(() => {
    return () => {
      soundSynth.current.stop();
      if (firestoreUnsubscribe.current) {
        firestoreUnsubscribe.current();
      }
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
    };
  }, []);

  // Captura de midia local com fallback inteligente
  const setupMedia = async (type: 'video' | 'audio'): Promise<MediaStream> => {
    try {
      if (type === 'video') {
        try {
          // Tentar capturar audio e video juntos
          const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
          return stream;
        } catch (videoError) {
          console.warn("Falha ao acessar camera. Ativando fallback para somente audio...", videoError);
          // Fallback síncrono para somente áudio
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          store.isVideoOff = true; // Seta video off na store
          return audioStream;
        }
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return audioStream;
      }
    } catch (e) {
      console.error("Nenhum hardware de captura de midia disponivel", e);
      throw e;
    }
  };

  // Processa a fila de ICE Candidates quando a remoteDescription for definida
  const processIceQueue = () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    while (iceQueue.current.length > 0) {
      const candidate = iceQueue.current.shift();
      if (candidate) {
        peerConnection.current.addIceCandidate(candidate)
          .catch(e => console.error("Erro ao adicionar ICE Candidate da fila", e));
      }
    }
  };

  // Configura os listeners no peerConnection
  const setupPeerListeners = (pc: RTCPeerConnection, callDocRef: any, isCaller: boolean) => {
    // Seta stream remota
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        useCallStore.setState({ remoteStream: event.streams[0] });
      }
    };

    // Coleta ICE candidates locais e salva no Firestore
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateStr = JSON.stringify(event.candidate.toJSON());
        updateDoc(callDocRef, {
          [isCaller ? 'callerCandidates' : 'calleeCandidates']: arrayUnion(candidateStr)
        }).catch(err => console.error("Erro ao enviar candidate", err));
      }
    };

    // Monitora o estado da conexao
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      store.updateConnectionState(state);

      if (state === 'connected') {
        soundSynth.current.stop();
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
      } else if (state === 'disconnected') {
        // Fallback de queda temporaria: Aguarda 15 segundos antes de derrubar a chamada
        connectionTimeout.current = setTimeout(() => {
          if (peerConnection.current?.connectionState === 'disconnected') {
            console.warn("Chamada desconectada por inatividade de rede (15s timeout)");
            endCall();
          }
        }, 15000);
      } else if (state === 'failed' || state === 'closed') {
        endCall();
      }
    };
  };

  // INICIAR UMA CHAMADA (Caller)
  const startCall = async (calleeId: string, calleeName: string, type: 'video' | 'audio', calleeAvatar?: string) => {
    if (!userProfile) return;
    
    // Configura o estado inicial da store
    const callId = crypto.randomUUID();
    useCallStore.setState({
      callStatus: 'calling',
      connectionState: 'new',
      callType: type,
      currentCallId: callId,
      otherParticipant: { uid: calleeId, name: calleeName, avatarUrl: calleeAvatar },
      isMuted: false,
      isVideoOff: type === 'audio',
      isOverlayMinimized: false
    });

    soundSynth.current.startCallingTone();

    try {
      // 1. Capturar midia local
      const localStream = await setupMedia(type);
      useCallStore.setState({ localStream });

      // 2. Instanciar PeerConnection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      // 3. Adicionar tracks locais
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // 4. Criar documento da chamada no Firestore
      const callDocRef = doc(db, 'calls', callId);
      
      // 5. Configurar listeners de rede
      setupPeerListeners(pc, callDocRef, true);

      // 6. Criar SDP Offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        type: offerDescription.type as 'offer',
        sdp: offerDescription.sdp,
      };

      const callData: CallDocument = {
        callerId: userProfile.uid,
        calleeId,
        status: 'calling',
        createdAt: Date.now(),
        callType: type,
        offer,
        callerCandidates: [],
        calleeCandidates: []
      };

      await setDoc(callDocRef, callData);

      // 7. Ouvir atualizacoes da chamada em tempo real (Signaling)
      firestoreUnsubscribe.current = onSnapshot(callDocRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as CallDocument;

        // Se o callee rejeitou ou a chamada terminou
        if (data.status === 'rejected' || data.status === 'ended') {
          hangUpLocal(false);
          return;
        }

        // Se o callee atendeu e mandou a resposta SDP
        if (data.status === 'answered' && data.answer && !pc.remoteDescription) {
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);
          useCallStore.setState({ callStatus: 'connected' });
          soundSynth.current.stop();
          processIceQueue();
        }

        // Se o callee mandou ICE candidates
        if (data.calleeCandidates && data.calleeCandidates.length > 0) {
          data.calleeCandidates.forEach((candidateStr) => {
            if (addedCandidates.current.has(candidateStr)) return;
            addedCandidates.current.add(candidateStr);

            const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
            if (pc.remoteDescription) {
              pc.addIceCandidate(candidate)
                .catch(err => console.error("Erro ao adicionar candidate recebido", err));
            } else {
              iceQueue.current.push(candidate);
            }
          });
        }
      });

    } catch (e) {
      console.error("Erro ao iniciar chamada WebRTC", e);
      hangUpLocal(true);
    }
  };

  // ATENDER CHAMADA (Callee)
  const answerCall = async () => {
    const { currentCallId, callType } = useCallStore.getState();
    if (!currentCallId) return;

    soundSynth.current.stop();

    try {
      // 1. Capturar midia local
      const localStream = await setupMedia(callType);
      useCallStore.setState({ localStream, callStatus: 'connected' });

      // 2. Instanciar PeerConnection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      // 3. Adicionar tracks locais
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const callDocRef = doc(db, 'calls', currentCallId);

      // 4. Configurar listeners de rede
      setupPeerListeners(pc, callDocRef, false);

      // 5. Obter oferta SDP do Firestore
      const snapshot = await getDoc(callDocRef);
      if (!snapshot.exists()) throw new Error("Chamada inexistente no Firestore");
      const callData = snapshot.data() as CallDocument;

      if (!callData.offer) throw new Error("Offer SDP ausente");

      // 6. Configurar remoteDescription (Offer do Caller)
      const offerDescription = new RTCSessionDescription(callData.offer);
      await pc.setRemoteDescription(offerDescription);

      // 7. Criar e configurar localDescription (Answer do Callee)
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      // 8. Atualizar documento no Firestore para answered e salvar answer
      await updateDoc(callDocRef, {
        status: 'answered',
        answer: {
          type: answerDescription.type as 'answer',
          sdp: answerDescription.sdp
        }
      });

      // 9. Processar quaisquer candidates pendentes da fila
      processIceQueue();

      // 10. Escutar atualizacoes futuras do Firestore
      firestoreUnsubscribe.current = onSnapshot(callDocRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as CallDocument;

        if (data.status === 'ended') {
          hangUpLocal(false);
          return;
        }

        // Escutar candidates adicionais do caller
        if (data.callerCandidates && data.callerCandidates.length > 0) {
          data.callerCandidates.forEach((candidateStr) => {
            if (addedCandidates.current.has(candidateStr)) return;
            addedCandidates.current.add(candidateStr);

            const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
            if (pc.remoteDescription) {
              pc.addIceCandidate(candidate)
                .catch(err => console.error("Erro ao adicionar candidate do caller", err));
            } else {
              iceQueue.current.push(candidate);
            }
          });
        }
      });

    } catch (e) {
      console.error("Erro ao atender chamada", e);
      rejectCall();
    }
  };

  // REJEITAR CHAMADA (Callee)
  const rejectCall = async () => {
    const { currentCallId } = useCallStore.getState();
    if (currentCallId) {
      const callDocRef = doc(db, 'calls', currentCallId);
      await updateDoc(callDocRef, { status: 'rejected' }).catch(() => {});
    }
    hangUpLocal(false);
  };

  // DESLIGAR CHAMADA ATIVA (Por qualquer uma das partes)
  const endCall = async () => {
    const { currentCallId } = useCallStore.getState();
    if (currentCallId) {
      const callDocRef = doc(db, 'calls', currentCallId);
      await updateDoc(callDocRef, { status: 'ended' }).catch(() => {});
    }
    hangUpLocal(false);
  };

  // Lógica local de finalização (evita duplicação no Firestore)
  const hangUpLocal = (updateFirestore: boolean = false) => {
    soundSynth.current.stop();

    if (firestoreUnsubscribe.current) {
      firestoreUnsubscribe.current();
      firestoreUnsubscribe.current = null;
    }

    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }

    // Parar todas as tracks locais de midia (libera camera/mic fisicamente)
    const localStream = useCallStore.getState().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    const remoteStream = useCallStore.getState().remoteStream;
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Fechar PeerConnection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Limpar fila e candidatos
    iceQueue.current = [];
    addedCandidates.current.clear();

    // Se solicitado para limpar Firestore (caso de erro na inicializacao)
    if (updateFirestore) {
      const { currentCallId } = useCallStore.getState();
      if (currentCallId) {
        const callDocRef = doc(db, 'calls', currentCallId);
        updateDoc(callDocRef, { status: 'ended' }).catch(() => {});
      }
    }

    // Resetar estado global da store
    store.resetStore();
  };

  return {
    startCall,
    answerCall,
    rejectCall,
    endCall,
    soundSynth: soundSynth.current
  };
}
