import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function VoiceCallModal({
  isOpen,
  roomId,
  roomName,
  isIncomingCall,
  incomingCaller,
  incomingOffer,
  onCloseCall
}) {
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected'
  const [isMuted, setIsMuted] = useState(false);
  const [peerStatus, setPeerStatus] = useState('Connecting...');

  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Initialize peer connection instance
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { toRoom: roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setPeerStatus('Connected (Active Call)');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start Voice Call (Caller)
  const startCall = async () => {
    try {
      setCallState('calling');
      setPeerStatus('Calling room members...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', { toRoom: roomId, offer, caller: user });
    } catch (err) {
      console.error('[WebRTC Error] Could not access microphone:', err);
      setPeerStatus('Microphone permission denied');
    }
  };

  // Accept Incoming Call (Callee)
  const acceptCall = async () => {
    try {
      setCallState('connecting');
      setPeerStatus('Connecting call...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', { toRoom: roomId, answer });
      setCallState('connected');
      setPeerStatus('Connected (Active Call)');
    } catch (err) {
      console.error('[WebRTC Error] Could not accept call:', err);
    }
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);
        socket.emit('toggle_audio', { toRoom: roomId, muted: newMutedState, username: user?.username });
      }
    }
  };

  // End Call
  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    socket.emit('end_call', { toRoom: roomId });
    setCallState('idle');
    setIsMuted(false);
    onCloseCall();
  };

  useEffect(() => {
    if (!isOpen) return;

    if (isIncomingCall) {
      setCallState('incoming');
      setPeerStatus(`Incoming call from ${incomingCaller?.username || 'Room Member'}`);
    } else {
      startCall();
    }

    // Signaling Socket Events
    const handleCallAnswered = async ({ answer }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connected');
        setPeerStatus('Connected (Active Call)');
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC Error] Failed to add ICE candidate:', err);
        }
      }
    };

    const handleAudioToggled = ({ muted, username }) => {
      if (username !== user?.username) {
        setPeerStatus(muted ? `${username} muted microphone` : `${username} unmuted microphone`);
      }
    };

    const handleCallEnded = () => {
      handleEndCall();
    };

    socket.on('call_answered', handleCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('audio_toggled', handleAudioToggled);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('call_answered', handleCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('audio_toggled', handleAudioToggled);
      socket.off('call_ended', handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="voice-call-overlay">
      <div className="voice-call-card">
        {/* Hidden Remote Audio Player */}
        <audio ref={remoteAudioRef} autoPlay />

        <div className="call-avatar-wrapper">
          <img
            src={
              callState === 'incoming' && incomingCaller?.avatar
                ? incomingCaller.avatar
                : user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatUser'
            }
            alt="Participant Avatar"
            className={`call-avatar-img ${callState === 'connected' ? 'pulse-audio' : ''}`}
          />
          {isMuted && <span className="muted-badge" title="Microphone Muted">🔇</span>}
        </div>

        <h3 className="call-room-title">#{roomName} Voice Call</h3>
        <p className="call-status-text">{peerStatus}</p>

        {/* Call Action Controls */}
        <div className="call-controls-row">
          {callState === 'incoming' ? (
            <>
              <button className="btn-call-accept" onClick={acceptCall}>
                📞 Accept
              </button>
              <button className="btn-call-decline" onClick={handleEndCall}>
                🔴 Decline
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-call-mute ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? '🎙️ Unmute' : '🎤 Mute'}
              </button>
              <button className="btn-call-end" onClick={handleEndCall}>
                🔴 Leave Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
