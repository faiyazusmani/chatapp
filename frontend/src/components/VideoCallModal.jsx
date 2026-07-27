import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';

// STUN discovers public IP; TURN relays media when STUN fails (symmetric NAT, cellular, firewalls)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'turn:a.relay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:a.relay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:a.relay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

export default function VideoCallModal({
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
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharerName, setScreenSharerName] = useState(null);
  const [peerStatus, setPeerStatus] = useState('Connecting...');

  // Full-screen focused participant ('local' | 'remote' | null)
  const [focusedParticipant, setFocusedParticipant] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  // Store target peer socket ID for direct signaling (not room-broadcast)
  const targetSocketIdRef = useRef(null);

  const log = (tag, ...args) => console.log(`[Video ${tag}]`, ...args);

  // Create & initialize WebRTC peer connection
  const createPeerConnection = () => {
    log('PC', 'Creating RTCPeerConnection with STUN+TURN ICE servers');
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidate — route to specific peer socket, not whole room
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // ─────────────────────────────────────────────────────────────────
        // EVENT: ICE Candidate Emitted
        // ─────────────────────────────────────────────────────────────────
        console.group('%c[Socket] 📤 ICE Candidate Emitted', 'color:#f59e0b;font-weight:bold');
        console.log('  type      :', event.candidate.type);
        console.log('  protocol  :', event.candidate.protocol);
        console.log('  address   :', event.candidate.address);
        console.log('  port      :', event.candidate.port);
        console.log('  target    :', targetSocketIdRef.current || '→ room (broadcast)');
        console.groupEnd();
        socket.emit('ice_candidate', { toRoom: roomId, toSocketId: targetSocketIdRef.current, candidate: event.candidate });
      } else {
        log('ICE Candidate Emitted', 'All local candidates gathered (null candidate)');
      }
    };

    // ── 1. connectionState ────────────────────────────────────────────────
    // Reflects overall P2P connection health
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      log('connectionState', '→', s);
      if (s === 'connected') {
        setCallState('connected');
        setPeerStatus('Video Call Active');
      } else if (s === 'failed') {
        log('connectionState', 'FAILED — check TURN server');
        setPeerStatus('Call failed — no relay available');
        handleEndCall();
      } else if (s === 'disconnected') {
        setPeerStatus('Connection interrupted...');
      }
    };

    // ── 2. iceConnectionState ────────────────────────────────────────────
    // Tracks ICE (NAT traversal) connectivity check progress
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      log('iceConnectionState', '→', s);
      
      if (s === 'checking') {
        // Set a timer to fail/restart if stuck in checking
        window.iceCheckingTimer = setTimeout(() => {
          if (pc.iceConnectionState === 'checking') {
            log('iceConnectionState', 'STUCK IN CHECKING for 12s — triggering ICE restart');
            pc.restartIce();
          }
        }, 12000);
      } else {
        clearTimeout(window.iceCheckingTimer);
      }

      if (s === 'failed') {
        log('iceConnectionState', 'FAILED — triggering ICE restart');
        pc.restartIce();
      }
    };

    // ── 3. iceGatheringState ─────────────────────────────────────────────
    // Tracks progress of local ICE candidate collection
    // new → gathering → complete
    pc.onicegatheringstatechange = () => {
      const s = pc.iceGatheringState;
      log('iceGatheringState', '→', s);
      if (s === 'complete') {
        log('iceGatheringState', 'Gathering complete. All local ICE candidates sent.');
      }
    };

    // ── 4. signalingState ────────────────────────────────────────────────
    // Tracks SDP offer/answer negotiation state machine
    // stable → have-local-offer → have-remote-offer → stable
    pc.onsignalingstatechange = () => {
      const s = pc.signalingState;
      log('signalingState', '→', s);
    };

    // ─────────────────────────────────────────────────────────────────
    // EVENT: Remote Track Received + Remote Stream Attached + Video Playback
    // ─────────────────────────────────────────────────────────────────
    pc.ontrack = (event) => {
      console.group('%c[Video] 📥 Remote Track Received', 'color:#22c55e;font-weight:bold');
      console.log('  track.kind     :', event.track.kind);
      console.log('  track.id       :', event.track.id);
      console.log('  track.enabled  :', event.track.enabled);
      console.log('  track.muted    :', event.track.muted);
      console.log('  stream count   :', event.streams.length);
      console.groupEnd();

      if (remoteVideoRef.current && event.streams[0]) {
        const remoteStream = event.streams[0];

        // EVENT: Remote Stream Attached
        console.group('%c[Video] 🔗 Remote Stream Attached', 'color:#22c55e;font-weight:bold');
        console.log('  stream.id      :', remoteStream.id);
        console.log('  video tracks   :', remoteStream.getVideoTracks().length);
        console.log('  audio tracks   :', remoteStream.getAudioTracks().length);
        console.groupEnd();

        remoteVideoRef.current.srcObject = remoteStream;

        // EVENT: Video Playback Started
        remoteVideoRef.current.play()
          .then(() => {
            console.log('%c[Video] 📹 Video Playback Started — remote video is live', 'color:#a855f7;font-weight:bold');
          })
          .catch(e => {
            console.warn('%c[Video] ⚠️ Video Playback Blocked by autoplay policy:', 'color:#ef4444;font-weight:bold', e.message);
          });
      }
    };

    peerConnectionRef.current = pc;
    window.pc = pc; // Exposed for debugging
    return pc;
  };

  // Process queued ICE candidates after setRemoteDescription
  const processQueuedIceCandidates = async (pc) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC Video Error] Failed to add queued ICE candidate:', err);
      }
    }
  };

  // Start Video Call (Caller Flow)
  const startCall = async () => {
    try {
      setCallState('calling');
      setPeerStatus('Initiating video call...');

      log('Call', 'Requesting camera + microphone via getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      log('Call', 'Media granted. Tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        log('addTrack', `Adding local ${track.kind} track: ${track.label}`);
        pc.addTrack(track, stream);
      });

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Offer Created
      // ─────────────────────────────────────────────────────────────────
      const offer = await pc.createOffer();
      console.group('%c[Video] 📤 Offer Created', 'color:#3b82f6;font-weight:bold');
      console.log('  type           :', offer.type);
      console.log('  sdp (excerpt)  :', offer.sdp?.substring(0, 120) + '...');
      console.log('  signalingState :', pc.signalingState);
      console.groupEnd();

      await pc.setLocalDescription(offer);

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Offer Emitted
      // ─────────────────────────────────────────────────────────────────
      console.group('%c[Socket] 📤 Offer Emitted', 'color:#14b8a6;font-weight:bold');
      console.log('  to room      :', roomId);
      console.log('  to socketId  :', 'null (broadcast)');
      console.groupEnd();

      socket.emit('video_call_user', { toRoom: roomId, toSocketId: null, offer, caller: user });
    } catch (err) {
      console.error('[WebRTC Error] Could not access camera/microphone:', err);
      setPeerStatus('Camera/Microphone permission denied');
    }
  };

  // Accept Incoming Video Call (Callee Flow)
  const acceptCall = async () => {
    try {
      setCallState('connecting');
      setPeerStatus('Connecting video feed...');

      log('Accept', 'Accepting video call from socket:', targetSocketIdRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      log('Accept', 'Media granted. Tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        log('addTrack', `Adding local ${track.kind} track: ${track.label}`);
        pc.addTrack(track, stream);
      });

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Offer Received
      // ─────────────────────────────────────────────────────────────────
      console.group('%c[Video] 📥 Offer Received', 'color:#6366f1;font-weight:bold');
      console.log('  offer.type     :', incomingOffer?.type);
      console.log('  from socket    :', targetSocketIdRef.current);
      console.log('  sdp (excerpt)  :', incomingOffer?.sdp?.substring(0, 120) + '...');
      console.groupEnd();

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await processQueuedIceCandidates(pc);

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Answer Created
      // ─────────────────────────────────────────────────────────────────
      const answer = await pc.createAnswer();
      console.group('%c[Video] 📤 Answer Created', 'color:#3b82f6;font-weight:bold');
      console.log('  type           :', answer.type);
      console.log('  signalingState :', pc.signalingState);
      console.log('  sdp (excerpt)  :', answer.sdp?.substring(0, 120) + '...');
      console.groupEnd();

      await pc.setLocalDescription(answer);

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Answer Emitted
      // ─────────────────────────────────────────────────────────────────
      console.group('%c[Socket] 📤 Answer Emitted', 'color:#14b8a6;font-weight:bold');
      console.log('  to room      :', roomId);
      console.log('  to socketId  :', targetSocketIdRef.current);
      console.groupEnd();

      socket.emit('video_call_answer', { toRoom: roomId, toSocketId: targetSocketIdRef.current, answer });

      setCallState('connected');
      setPeerStatus('Video Call Active');
    } catch (err) {
      console.error('[WebRTC Error] Could not accept video call:', err);
      setPeerStatus('Failed to connect video stream');
    }
  };

  // Toggle Camera On/Off
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newCameraState = !videoTrack.enabled;
        setIsCameraOff(newCameraState);
        socket.emit('toggle_camera', { toRoom: roomId, cameraOff: newCameraState, username: user?.username });
      }
    }
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Screen Sharing using Screen Capture API (getDisplayMedia)
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        setScreenSharerName(user?.username);
        socket.emit('screen_share_start', { toRoom: roomId, username: user?.username });

        // Handle user stopping screen share from browser native bar
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('[Screen Capture Error] Could not start screen sharing:', err);
      }
    } else {
      await stopScreenShare();
    }
  };

  // Stop Screen Share & Restore Camera Stream
  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
    setScreenSharerName(null);
    socket.emit('screen_share_stop', { toRoom: roomId, username: user?.username });
  };

  // End Video Call & Clean Up
  const handleEndCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      log('End', 'RTCPeerConnection closed');
    }

    iceCandidateQueueRef.current = [];
    targetSocketIdRef.current = null;
    socket.emit('end_video_call', { toRoom: roomId });
    setCallState('idle');
    setIsCameraOff(false);
    setIsMuted(false);
    setIsScreenSharing(false);
    setFocusedParticipant(null);
    onCloseCall();
  };

  useEffect(() => {
    if (!isOpen) return;

    if (isIncomingCall) {
      setCallState('incoming');
      setPeerStatus(`Incoming video call from ${incomingCaller?.username || 'Room Member'}`);
    } else {
      startCall();
    }

    // Signaling socket event listeners
    const handleVideoCallIncoming = ({ offer, caller, fromSocket }) => {
      log('Incoming', 'Video call from socket:', fromSocket, 'user:', caller?.username);
      targetSocketIdRef.current = fromSocket;
    };

    const handleVideoCallAnswered = async ({ answer, fromSocket }) => {
      const pc = peerConnectionRef.current;
      if (fromSocket) {
        targetSocketIdRef.current = fromSocket;
      }

      // ─────────────────────────────────────────────────────────────────
      // EVENT: Answer Received
      // ─────────────────────────────────────────────────────────────────
      console.group('%c[Video] 📥 Answer Received', 'color:#6366f1;font-weight:bold');
      console.log('  answer.type    :', answer?.type);
      console.log('  signalingState :', pc?.signalingState);
      console.log('  sdp (excerpt)  :', answer?.sdp?.substring(0, 120) + '...');
      console.groupEnd();

      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        log('Answer Received', 'Remote description set. signalingState:', pc.signalingState);
        await processQueuedIceCandidates(pc);
        setCallState('connected');
        setPeerStatus('Video Call Active');
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;

      // ─────────────────────────────────────────────────────────────────
      // EVENT: ICE Candidate Received
      // ─────────────────────────────────────────────────────────────────
      console.group('%c[Video] 📥 ICE Candidate Received', 'color:#f59e0b;font-weight:bold');
      console.log('  type           :', candidate?.type);
      console.log('  protocol       :', candidate?.protocol);
      console.log('  address        :', candidate?.address);
      console.log('  remoteDesc set :', !!(pc?.remoteDescription?.type));
      console.groupEnd();

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          log('ICE Candidate Received', 'Added successfully');
        } catch (err) {
          log('ICE Candidate Received', 'Failed:', err.message);
        }
      } else {
        log('ICE Candidate Received', 'Queuing — remote desc not set yet');
        iceCandidateQueueRef.current.push(candidate);
      }
    };

    const handleScreenShareStarted = ({ username }) => {
      setScreenSharerName(username);
    };

    const handleScreenShareStopped = () => {
      setScreenSharerName(null);
    };

    const handleVideoCallEnded = () => {
      handleEndCall();
    };

    socket.on('video_call_incoming', handleVideoCallIncoming);
    socket.on('video_call_answered', handleVideoCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);
    socket.on('video_call_ended', handleVideoCallEnded);

    return () => {
      socket.off('video_call_incoming', handleVideoCallIncoming);
      socket.off('video_call_answered', handleVideoCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('screen_share_started', handleScreenShareStarted);
      socket.off('screen_share_stopped', handleScreenShareStopped);
      socket.off('video_call_ended', handleVideoCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 23, 0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div style={{ background: '#1D2129', border: '1px solid #313743', borderRadius: 16, width: '100%', maxWidth: focusedParticipant ? 960 : 720, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', transition: 'all 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #313743', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161921' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>📹 #{roomName} Video Room</h3>
            <span style={{ fontSize: 11, color: '#22C55E' }}>{peerStatus}</span>
          </div>
          {screenSharerName && (
            <div style={{ padding: '4px 10px', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid #7C3AED', borderRadius: 6, fontSize: 11, color: '#8B5CF6' }}>
              🖥️ {screenSharerName} is sharing screen
            </div>
          )}
        </div>

        {/* Video Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: focusedParticipant ? '1fr' : '1fr 1fr', gap: 12, padding: 16, background: '#0F1117', minHeight: 320 }}>
          {/* Local Video Stream Card */}
          {(!focusedParticipant || focusedParticipant === 'local') && (
            <div
              onClick={() => setFocusedParticipant((prev) => (prev === 'local' ? null : 'local'))}
              title="Click to toggle full-screen focus"
              style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#1D2129', aspectRatio: '16/9', cursor: 'pointer', border: '1px solid #313743' }}
            >
              {isCameraOff && !isScreenSharing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', gap: 8 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600 }}>
                    {user?.username?.substring(0, 2).toUpperCase() || 'YO'}
                  </div>
                  <span style={{ fontSize: 12 }}>Camera Off</span>
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, fontSize: 11, color: '#fff' }}>
                {isScreenSharing ? 'Your Screen Share' : `You (${user?.username})`} {isMuted && '🔇'}
              </div>
            </div>
          )}

          {/* Remote Video Stream Card */}
          {(!focusedParticipant || focusedParticipant === 'remote') && (
            <div
              onClick={() => setFocusedParticipant((prev) => (prev === 'remote' ? null : 'remote'))}
              title="Click to toggle full-screen focus"
              style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#1D2129', aspectRatio: '16/9', cursor: 'pointer', border: '1px solid #313743' }}
            >
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, fontSize: 11, color: '#fff' }}>
                {incomingCaller?.username || 'Peer Participant'}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls Toolbar */}
        <div style={{ padding: 16, borderTop: '1px solid #313743', display: 'flex', justifyContent: 'center', gap: 10, background: '#161921' }}>
          {callState === 'incoming' ? (
            <>
              <button onClick={acceptCall} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                📹 Accept Video Call
              </button>
              <button onClick={handleEndCall} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                🔴 Decline
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleCamera} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #313743', background: isCameraOff ? 'rgba(239, 68, 68, 0.2)' : '#242930', color: isCameraOff ? '#EF4444' : '#fff', fontSize: 12, cursor: 'pointer' }}>
                {isCameraOff ? '📷 Camera Off' : '📷 Camera On'}
              </button>

              <button onClick={toggleMute} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #313743', background: isMuted ? 'rgba(239, 68, 68, 0.2)' : '#242930', color: isMuted ? '#EF4444' : '#fff', fontSize: 12, cursor: 'pointer' }}>
                {isMuted ? '🎙️ Unmute' : '🎤 Mute'}
              </button>

              <button onClick={toggleScreenShare} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #7C3AED', background: isScreenSharing ? '#7C3AED' : 'rgba(124, 58, 237, 0.2)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
              </button>

              <button onClick={handleEndCall} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                🔴 End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

VideoCallModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  roomId: PropTypes.string.isRequired,
  roomName: PropTypes.string.isRequired,
  isIncomingCall: PropTypes.bool,
  incomingCaller: PropTypes.object,
  incomingOffer: PropTypes.object,
  onCloseCall: PropTypes.func.isRequired
};
