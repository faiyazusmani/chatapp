import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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

  // Initialize peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { toRoom: roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

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

  // Start Video Call (Caller)
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

  // Accept Incoming Video Call (Callee)
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
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_call_answer', { toRoom: roomId, answer });
      setCallState('connected');
      setPeerStatus('Video Call Active');
    } catch (err) {
      console.error('[WebRTC Error] Could not accept video call:', err);
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
          videoSender.replaceTrack(screenTrack);
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
      stopScreenShare();
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
        videoSender.replaceTrack(cameraTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
    setScreenSharerName(null);
    socket.emit('screen_share_stop', { toRoom: roomId, username: user?.username });
  };

  // End Video Call
  const handleEndCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

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
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connected');
        setPeerStatus('Video Call Active');
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
    <div className="video-call-overlay">
      <div className={`video-call-modal-card ${focusedParticipant ? 'fullscreen-mode' : ''}`}>
        {/* Header */}
        <div className="video-call-header">
          <div>
            <h3>📹 #{roomName} Video Room</h3>
            <span className="call-status-badge">{peerStatus}</span>
          </div>
          {screenSharerName && (
            <div className="screen-share-banner">
              🖥️ {screenSharerName} is sharing screen
            </div>
          )}
        </div>

        {/* Video Grid Layout */}
        <div className={`video-grid-container ${focusedParticipant ? 'has-focused' : ''}`}>
          {/* Local Video Stream Card */}
          <div
            className={`video-tile ${focusedParticipant === 'local' ? 'focused-tile' : ''}`}
            onClick={() => setFocusedParticipant((prev) => (prev === 'local' ? null : 'local'))}
            title="Click to toggle full-screen focus"
          >
            {isCameraOff ? (
              <div className="camera-off-placeholder">
                <img
                  src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatUser'}
                  alt={user?.username}
                  className="camera-off-avatar"
                />
                <span>Camera Off</span>
              </div>
            ) : (
              <video ref={localVideoRef} autoPlay muted playsInline className="video-feed-element" />
            )}
            <div className="video-tile-label">
              You ({user?.username}) {isMuted && '🔇'}
            </div>
          </div>

          {/* Remote Video Stream Card */}
          <div
            className={`video-tile ${focusedParticipant === 'remote' ? 'focused-tile' : ''}`}
            onClick={() => setFocusedParticipant((prev) => (prev === 'remote' ? null : 'remote'))}
            title="Click to toggle full-screen focus"
          >
            <video ref={remoteVideoRef} autoPlay playsInline className="video-feed-element" />
            <div className="video-tile-label">
              {incomingCaller?.username || 'Peer Participant'}
            </div>
          </div>
        </div>

        {/* Call Controls Toolbar */}
        <div className="video-call-toolbar">
          {callState === 'incoming' ? (
            <>
              <button className="btn-call-accept" onClick={acceptCall}>
                📹 Accept Video Call
              </button>
              <button className="btn-call-decline" onClick={handleEndCall}>
                🔴 Decline
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-toolbar-icon ${isCameraOff ? 'off' : ''}`}
                onClick={toggleCamera}
                title="Toggle Camera On/Off"
              >
                {isCameraOff ? '📷 Camera Off' : '📷 Camera On'}
              </button>

              <button
                className={`btn-toolbar-icon ${isMuted ? 'off' : ''}`}
                onClick={toggleMute}
                title="Toggle Microphone Mute"
              >
                {isMuted ? '🎙️ Unmute' : '🎤 Mute'}
              </button>

              <button
                className={`btn-toolbar-icon ${isScreenSharing ? 'active-share' : ''}`}
                onClick={toggleScreenShare}
                title="Share Screen using Screen Capture API"
              >
                {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
              </button>

              <button className="btn-call-end" onClick={handleEndCall} title="End Video Call">
                🔴 End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
