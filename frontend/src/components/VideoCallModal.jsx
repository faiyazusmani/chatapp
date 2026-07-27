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

  // Create & initialize WebRTC peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidate Generation Event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { toRoom: roomId, candidate: event.candidate });
      }
    };

    // Remote Video Track Received
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Connection State Monitor
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setPeerStatus('Video Call Active');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    peerConnectionRef.current = pc;
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

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('video_call_user', { toRoom: roomId, offer, caller: user });
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

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await processQueuedIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_call_answer', { toRoom: roomId, answer });
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
    }

    iceCandidateQueueRef.current = [];
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
    const handleVideoCallAnswered = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await processQueuedIceCandidates(pc);
        setCallState('connected');
        setPeerStatus('Video Call Active');
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

    socket.on('video_call_answered', handleVideoCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);
    socket.on('video_call_ended', handleVideoCallEnded);

    return () => {
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
