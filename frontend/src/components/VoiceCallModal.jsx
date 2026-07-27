import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
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
  const iceCandidateQueueRef = useRef([]);

  // Create & configure WebRTC RTCPeerConnection instance
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidate Generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { toRoom: roomId, candidate: event.candidate });
      }
    };

    // Remote Audio Track Stream Received
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Connection State Monitor
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

  // Helper to process queued ICE candidates after setRemoteDescription
  const processQueuedIceCandidates = async (pc) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC Voice Error] Failed to add queued ICE candidate:', err);
      }
    }
  };

  // Start Voice Call (Caller Flow)
  const startCall = async () => {
    try {
      setCallState('calling');
      setPeerStatus('Calling room members...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create & Set Local SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit SDP Offer via Socket.io signaling
      socket.emit('call_user', { toRoom: roomId, offer, caller: user });
    } catch (err) {
      console.error('[WebRTC Error] Microphone permission denied or unavailable:', err);
      setPeerStatus('Microphone permission denied');
    }
  };

  // Accept Incoming Call (Callee Flow)
  const acceptCall = async () => {
    try {
      setCallState('connecting');
      setPeerStatus('Connecting call...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Set Remote Description (Caller's Offer) & Create Answer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await processQueuedIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit SDP Answer via Socket.io signaling
      socket.emit('answer_call', { toRoom: roomId, answer });
      setCallState('connected');
      setPeerStatus('Connected (Active Call)');
    } catch (err) {
      console.error('[WebRTC Error] Failed to accept call:', err);
      setPeerStatus('Failed to connect call');
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

  // End Call & Cleanup
  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    iceCandidateQueueRef.current = [];
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

    // WebRTC Signaling Socket Events
    const handleCallAnswered = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await processQueuedIceCandidates(pc);
        setCallState('connected');
        setPeerStatus('Connected (Active Call)');
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC Error] Failed to add ICE candidate:', err);
        }
      } else {
        // Queue candidate until remote description is set
        iceCandidateQueueRef.current.push(candidate);
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 23, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#1D2129', border: '1px solid #313743', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        {/* Hidden Remote Audio Player */}
        <audio ref={remoteAudioRef} autoPlay />

        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#7C3AED', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff' }}>
          📞
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>#{roomName} Voice Call</h3>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 20px' }}>{peerStatus}</p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {callState === 'incoming' ? (
            <>
              <button onClick={acceptCall} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                📞 Accept
              </button>
              <button onClick={handleEndCall} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                🔴 Decline
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #313743', background: isMuted ? 'rgba(239, 68, 68, 0.2)' : '#242930', color: isMuted ? '#EF4444' : '#fff', fontWeight: 500, fontSize: 12, cursor: 'pointer' }}>
                {isMuted ? '🎙️ Unmute' : '🎤 Mute'}
              </button>
              <button onClick={handleEndCall} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                🔴 End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

VoiceCallModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  roomId: PropTypes.string.isRequired,
  roomName: PropTypes.string.isRequired,
  isIncomingCall: PropTypes.bool,
  incomingCaller: PropTypes.object,
  incomingOffer: PropTypes.object,
  onCloseCall: PropTypes.func.isRequired
};
