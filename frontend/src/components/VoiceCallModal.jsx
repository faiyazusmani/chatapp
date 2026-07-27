import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';

/**
 * ICE_SERVERS Configuration
 *
 * WHY STUN ALONE FAILS ON DIFFERENT NETWORKS:
 * - STUN helps a peer discover its public-facing IP:port (server-reflexive candidate).
 * - This works when both peers are behind "Full Cone" or "Restricted Cone" NAT.
 * - Mobile networks (4G/5G), corporate Wi-Fi, and many home routers use "Symmetric NAT",
 *   which means the external port changes for every destination. The STUN-discovered
 *   address is NOT reachable from the other peer.
 *
 * WHY A TURN SERVER IS REQUIRED:
 * - A TURN (Traversal Using Relays around NAT) server sits in the public internet.
 * - Both peers open a connection TO the TURN server (outbound, always allowed).
 * - All media is relayed through the TURN server, bypassing NAT restrictions entirely.
 * - Without a TURN server, ~30-40% of real-world WebRTC connections fail.
 *
 * FREE TURN OPTION: Open Relay (metered.ca free tier for testing)
 * For production, self-host Coturn or use Twilio / Metered / Xirsys.
 */
const ICE_SERVERS = {
  iceServers: [
    // STUN servers — discovers public IP (works for open/cone NAT)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // TURN relay servers — relays media when STUN fails (symmetric NAT, cellular, strict firewall)
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:a.relay.metered.ca:80?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:a.relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export default function VoiceCallModal({
  isOpen,
  roomId,
  roomName,
  isIncomingCall,
  incomingCaller,
  incomingOffer,
  callerSocketId,      // <-- Caller's socket.id passed from ChatWindow
  onCloseCall
}) {
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [peerStatus, setPeerStatus] = useState('Connecting...');
  const [iceStatus, setIceStatus] = useState('');

  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  // FIX: Store the target socket ID so ICE/SDP are routed peer-to-peer
  const targetSocketIdRef = useRef(null);

  const log = (tag, ...args) => {
    console.log(`[Voice ${tag}]`, ...args);
  };

  // Create & configure WebRTC RTCPeerConnection instance
  const createPeerConnection = () => {
    log('PC', 'Creating RTCPeerConnection with ICE servers:', ICE_SERVERS.iceServers.map(s => s.urls));
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidate Generation — send to specific peer socket ID
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log('ICE', 'Sending ICE candidate to', targetSocketIdRef.current || 'room', event.candidate.type, event.candidate.protocol);
        socket.emit('ice_candidate', {
          toRoom: roomId,
          toSocketId: targetSocketIdRef.current,
          candidate: event.candidate
        });
      } else {
        log('ICE', 'All ICE candidates gathered (null candidate = done)');
      }
    };

    // ICE Connection State Changes — critical for cross-network diagnosis
    pc.oniceconnectionstatechange = () => {
      log('ICE', 'iceConnectionState →', pc.iceConnectionState);
      setIceStatus(pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        log('ICE', 'ICE FAILED — TURN server likely needed or blocked. Triggering ICE restart...');
        setPeerStatus('Connection failed — retrying...');
        // ICE restart: renegotiate new candidates
        pc.restartIce();
      }
      if (pc.iceConnectionState === 'disconnected') {
        setPeerStatus('Connection interrupted...');
      }
    };

    // Signaling State Changes
    pc.onsignalingstatechange = () => {
      log('Signaling', 'signalingState →', pc.signalingState);
    };

    // Connection State Changes
    pc.onconnectionstatechange = () => {
      log('Connection', 'connectionState →', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setPeerStatus('Connected (Active Call)');
        setIceStatus('connected');
      } else if (pc.connectionState === 'failed') {
        log('Connection', 'FAILED — media cannot flow. Check TURN server configuration.');
        setPeerStatus('Call failed — no TURN relay available');
        handleEndCall();
      } else if (pc.connectionState === 'disconnected') {
        setPeerStatus('Connection lost...');
      }
    };

    // Remote Audio Track Received
    pc.ontrack = (event) => {
      log('Track', 'Remote track received:', event.track.kind, '| streams:', event.streams.length);
      if (event.streams && event.streams[0]) {
        log('Track', 'Attaching remote stream to audio element');
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          // FIX: Explicitly call .play() to bypass browser autoplay policy restrictions
          remoteAudioRef.current.play().catch((err) => {
            log('Audio', 'Autoplay blocked by browser policy:', err.message);
          });
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Process buffered ICE candidates after setRemoteDescription
  const processQueuedIceCandidates = async (pc) => {
    log('ICE', `Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        log('ICE', 'Queued ICE candidate added successfully');
      } catch (err) {
        log('ICE', 'Failed to add queued candidate:', err.message);
      }
    }
  };

  // Start Voice Call (Caller Flow)
  const startCall = async () => {
    try {
      setCallState('calling');
      setPeerStatus('Calling room members...');

      log('Call', 'Requesting microphone access via getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('Call', 'Microphone granted. Tracks:', stream.getAudioTracks().map(t => t.label));
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        log('Call', 'Adding local audio track to peer connection:', track.label);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      log('Offer', 'Created SDP offer:', offer.type);
      await pc.setLocalDescription(offer);
      log('Offer', 'Local description set. signalingState:', pc.signalingState);

      socket.emit('call_user', { toRoom: roomId, toSocketId: null, offer, caller: user });
      log('Offer', 'Offer emitted to room:', roomId);
    } catch (err) {
      log('Error', 'getUserMedia failed:', err.message);
      setPeerStatus('Microphone permission denied');
    }
  };

  // Accept Incoming Call (Callee Flow)
  const acceptCall = async () => {
    try {
      setCallState('connecting');
      setPeerStatus('Connecting call...');

      log('Accept', 'Accepting call from socket:', targetSocketIdRef.current);
      log('Accept', 'Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('Accept', 'Microphone granted. Tracks:', stream.getAudioTracks().map(t => t.label));
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        log('Accept', 'Adding local audio track:', track.label);
        pc.addTrack(track, stream);
      });

      log('Answer', 'Setting remote description (incoming offer)...');
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      log('Answer', 'Remote description set. signalingState:', pc.signalingState);

      await processQueuedIceCandidates(pc);

      const answer = await pc.createAnswer();
      log('Answer', 'Created SDP answer:', answer.type);
      await pc.setLocalDescription(answer);
      log('Answer', 'Local description set. signalingState:', pc.signalingState);

      // FIX: Route answer directly to caller's socket ID
      socket.emit('answer_call', {
        toRoom: roomId,
        toSocketId: targetSocketIdRef.current,
        answer
      });
      log('Answer', 'Answer emitted to socket:', targetSocketIdRef.current);

      setCallState('connected');
      setPeerStatus('Connected (Active Call)');
    } catch (err) {
      log('Error', 'acceptCall failed:', err.message);
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
        log('Mute', newMutedState ? 'Microphone muted' : 'Microphone unmuted');
        socket.emit('toggle_audio', { toRoom: roomId, muted: newMutedState, username: user?.username });
      }
    }
  };

  // End Call & Cleanup
  const handleEndCall = () => {
    log('End', 'Ending call and cleaning up resources');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        log('End', 'Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      log('End', 'RTCPeerConnection closed');
    }

    iceCandidateQueueRef.current = [];
    targetSocketIdRef.current = null;
    socket.emit('end_call', { toRoom: roomId });
    setCallState('idle');
    setIsMuted(false);
    setIceStatus('');
    onCloseCall();
  };

  useEffect(() => {
    if (!isOpen) return;

    // FIX: Pre-seed targetSocketIdRef from the prop passed by ChatWindow.
    // For the callee this is set BEFORE they click Accept, so that the
    // SDP answer and all ICE candidates are routed directly to the caller's
    // socket ID rather than being broadcast to the entire room.
    if (isIncomingCall && callerSocketId) {
      targetSocketIdRef.current = callerSocketId;
      log('Incoming', 'Pre-seeded targetSocketId from prop:', callerSocketId);
    }

    if (isIncomingCall) {
      setCallState('incoming');
      setPeerStatus(`Incoming call from ${incomingCaller?.username || 'Room Member'}`);
    } else {
      startCall();
    }

    // WebRTC Signaling Socket Events
    const handleCallAnswered = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      log('Answer', 'Received answer from callee. signalingState:', pc?.signalingState);
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        log('Answer', 'Remote description set from answer. signalingState:', pc.signalingState);
        await processQueuedIceCandidates(pc);
        setCallState('connected');
        setPeerStatus('Connected (Active Call)');
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      log('ICE', 'Received ICE candidate from peer:', candidate?.type, candidate?.protocol);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          log('ICE', 'ICE candidate added successfully');
        } catch (err) {
          log('ICE', 'Failed to add ICE candidate:', err.message);
        }
      } else {
        log('ICE', 'Remote description not set yet — queuing ICE candidate');
        iceCandidateQueueRef.current.push(candidate);
      }
    };

    const handleCallIncoming = ({ offer, caller, fromSocket }) => {
      // Store the caller's socket ID for targeted signaling
      log('Incoming', 'Call incoming from socket:', fromSocket, 'user:', caller?.username);
      targetSocketIdRef.current = fromSocket;
    };

    const handleAudioToggled = ({ muted, username }) => {
      if (username !== user?.username) {
        log('Remote', username, muted ? 'muted' : 'unmuted', 'their microphone');
        setPeerStatus(muted ? `${username} muted microphone` : `${username} unmuted microphone`);
      }
    };

    const handleCallEnded = () => {
      log('End', 'Remote peer ended the call');
      handleEndCall();
    };

    socket.on('call_incoming', handleCallIncoming);
    socket.on('call_answered', handleCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('audio_toggled', handleAudioToggled);
    socket.on('call_ended', handleCallEnded);

    // FIX: Store caller's fromSocket when incoming call arrives
    if (isIncomingCall && incomingCaller) {
      log('Incoming', 'Incoming call modal opened. Waiting for accept...');
    }

    return () => {
      socket.off('call_incoming', handleCallIncoming);
      socket.off('call_answered', handleCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('audio_toggled', handleAudioToggled);
      socket.off('call_ended', handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 23, 0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#1D2129', border: '1px solid #313743', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        {/* FIX: Added playsInline to prevent mobile Safari autoplay block */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#7C3AED', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff' }}>
          📞
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>#{roomName} Voice Call</h3>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>{peerStatus}</p>
        {iceStatus && (
          <p style={{ fontSize: 10, color: iceStatus === 'connected' ? '#22C55E' : '#F59E0B', margin: '0 0 16px', fontFamily: 'monospace' }}>
            ICE: {iceStatus}
          </p>
        )}

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
  callerSocketId: PropTypes.string,
  onCloseCall: PropTypes.func.isRequired
};
