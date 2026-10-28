import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import ProfileSetupModal from '../components/profile/ProfileSetupModal';
import ChatWindow from '../components/ChatWindow';
import ErrorBoundary from '../components/ErrorBoundary';
import CallHistoryPage from './CallHistoryPage';
import NotificationSection from '../components/notifications/NotificationSection';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';
import { requestNotificationPermission, showDesktopNotification } from '../utils/desktopNotifications';
import { themeSoundManager } from '../utils/themeSoundManager';
import { animateEmptyState } from '../utils/animations';

export default function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);
  const emptyCardRef = useRef(null);

  useEffect(() => {
    if (!activeRoom && emptyCardRef.current) {
      animateEmptyState(emptyCardRef.current);
    }
  }, [activeRoom]);

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'public' | 'private' | 'joined' | 'calls'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  // Room that triggered the join-code modal (private room without access)
  const [pendingJoinRoom, setPendingJoinRoom] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // In-app Notifications State (persisted per user with auto-deduplication)
  const [notifications, setNotifications] = useState(() => {
    try {
      const uid = user?._id || user?.id || 'guest';
      const stored = JSON.parse(localStorage.getItem(`app_notifications_${uid}`) || '[]');
      const seen = new Set();
      return stored.filter((n) => {
        const key = n.messageId || n.id || `${n.roomId}_${n.title}_${n.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      return [];
    }
  });

  // Track already processed incoming message IDs to prevent double execution from concurrent socket events
  const processedMessageIdsRef = useRef(new Set());

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  // Sync notifications to localStorage
  useEffect(() => {
    const uid = user?._id || user?.id || 'guest';
    try {
      localStorage.setItem(`app_notifications_${uid}`, JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications, user]);

  // Mark all notifications as read when visiting notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }
  }, [activeTab]);

  // Fetch pending follow requests to populate initial notification feed
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      try {
        const res = await api.get('/users/follow-requests');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = res.data
              .map((req) => {
                const reqId = `notif_req_${req._id || req.from?._id}`;
                if (existingIds.has(reqId)) return null;
                return {
                  id: reqId,
                  type: 'follow_request',
                  title: req.from?.fullName || req.from?.username || 'User',
                  message: 'Sent you a follow request',
                  sender: req.from,
                  targetUserId: req.from?._id,
                  createdAt: req.createdAt || new Date().toISOString(),
                  unread: true
                };
              })
              .filter(Boolean);
            return [...newOnes, ...prev].slice(0, 50);
          });
        }
      } catch (err) {
        console.warn('Failed to fetch follow requests for notifications:', err);
      }
    };
    fetchRequests();
  }, [user]);

  // Listen for real-time follow requests
  useEffect(() => {
    const handleFollowRequest = (data) => {
      const fromUser = data.from || data.user || data;
      const reqId = `notif_req_${data._id || fromUser._id || Date.now()}`;
      const newNotif = {
        id: reqId,
        type: 'follow_request',
        title: fromUser.fullName || fromUser.username || 'User',
        message: 'Sent you a follow request',
        sender: fromUser,
        targetUserId: fromUser._id || fromUser.id,
        createdAt: new Date().toISOString(),
        unread: true
      };
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== reqId)].slice(0, 50));
      try {
        themeSoundManager.playNotificationSound();
      } catch (e) {}
      showToast({
        text: `New follow request from @${fromUser.username}`,
        icon: '👥'
      }, 4000);
      showDesktopNotification(
        '👥 New Follow Request',
        `@${fromUser.username} sent you a follow request`,
        null,
        fromUser.avatar
      );
    };

    socket.on('follow_request_received', handleFollowRequest);
    return () => socket.off('follow_request_received', handleFollowRequest);
  }, []);

  // Unread counts per room (roomId -> count) for badges + document.title
  const [unreadCounts, setUnreadCounts] = useState({});

  // Responsive UI state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Instagram-style: mobile chat screen open (rooms list slides left, chat slides in from right)
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const mobileChatOpenRef = useRef(false);
  mobileChatOpenRef.current = mobileChatOpen;

  // When the viewport crosses back to desktop, reset the mobile chat screen
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && mobileChatOpenRef.current) {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Browser back button / mobile back gesture support:
  // We push a history entry when the mobile chat opens (same URL), so that
  // pressing back pops OUR entry, fires popstate, and closes the chat instead
  // of navigating away from the app.
  useEffect(() => {
    const onPopState = () => {
      if (window.innerWidth < 768 && mobileChatOpenRef.current) {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Open the mobile chat screen, pushing a history entry so browser-back
  // closes the chat instead of leaving the app.
  const openMobileChat = useCallback(() => {
    if (!mobileChatOpenRef.current) {
      try {
        window.history.pushState({ chatAppChatOpen: true }, '');
      } catch {
        /* history API unavailable — chat still opens, back exits the app */
      }
    }
    setMobileChatOpen(true);
  }, []);

  // Close the mobile chat screen. If we pushed a history entry, pop it so
  // the history stack stays consistent with the visible screen.
  const closeMobileChat = useCallback(() => {
    setMobileChatOpen(false);
    if (window.history.state?.chatAppChatOpen) {
      try {
        window.history.back();
      } catch {
        /* noop */
      }
    }
  }, []);

  const showToast = useCallback((msg, duration = 4000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, duration);
  }, []);

  const markRoomAsRead = useCallback((rId) => {
    if (!rId) return;
    try {
      const res = api.post(`/messages/${rId}/read`);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    } catch {}
  }, []);

  // Fetch all rooms from backend API
  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await api.get('/rooms');
      // Backend returns { rooms: [...], total, page, hasMore } — unwrap defensively
      const data = response.data;
      setRooms(Array.isArray(data) ? data : data?.rooms || []);
    } catch (err) {
      console.error('[Rooms Error] Failed to fetch rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Auto-prompt new users to set up profile photo & status upon logging in
  useEffect(() => {
    if (!user) return;
    const uid = String(user._id || user.id || '');
    if (!uid) return;

    const isAlreadyDone = localStorage.getItem(`profile_setup_done_${uid}`) === 'true';
    const isDismissed = sessionStorage.getItem(`profile_setup_dismissed_${uid}`) === 'true';
    const needsSetup = (user.isNewUser || user.isProfileSetupCompleted === false) && !isAlreadyDone && !isDismissed;

    if (needsSetup) {
      const timer = setTimeout(() => {
        setIsProfileSetupOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // ── Unread tracking + desktop notifications ────────────────────────
  // Request notification permission once on first user gesture
  useEffect(() => {
    const requestOnce = () => {
      requestNotificationPermission();
      window.removeEventListener('pointerdown', requestOnce);
    };
    window.addEventListener('pointerdown', requestOnce);
    return () => window.removeEventListener('pointerdown', requestOnce);
  }, []);


  // Count unread messages and notify for rooms that aren't the active, visible one
  useEffect(() => {
    const onReceive = (newMsg) => {
      const roomKey = newMsg.room;
      if (!roomKey) return;
      const senderId = newMsg.sender?._id || newMsg.sender?.id;
      const myId = user?._id || user?.id;
      if (String(senderId) === String(myId)) return; // never count your own messages

      const msgId = String(newMsg._id || newMsg.id || '');
      // Strict guard against processing the exact same message event multiple times
      if (msgId && processedMessageIdsRef.current.has(msgId)) {
        return;
      }
      if (msgId) {
        processedMessageIdsRef.current.add(msgId);
        if (processedMessageIdsRef.current.size > 200) {
          const arr = Array.from(processedMessageIdsRef.current);
          processedMessageIdsRef.current = new Set(arr.slice(100));
        }
      }

      const isActiveRoom = activeRoom && (activeRoom._id || activeRoom.id) === roomKey;
      // On mobile the active room only counts as "being read" while the chat screen is open
      const chatVisible = window.innerWidth >= 768 || mobileChatOpenRef.current;
      const isVisible = !document.hidden && document.hasFocus();

      if (isActiveRoom && chatVisible && isVisible) {
        // Message is being viewed live right now — mark read on DB and skip creating notification
        markRoomAsRead(roomKey);
        return;
      }

      // 1. Increment unread counter for room
      setUnreadCounts((prev) => ({ ...prev, [roomKey]: (prev[roomKey] || 0) + 1 }));

      // 2. Play audio notification chime
      try {
        themeSoundManager.playNotificationSound();
      } catch (e) {}

      // 3. Add to Notifications Section feed (deterministic notifId by message ID)
      const senderName = newMsg.sender?.fullName || newMsg.sender?.username || 'Someone';
      const textPreview = newMsg.content || (newMsg.fileType ? `Sent a ${newMsg.fileType}` : 'Sent a file');
      const notifId = msgId ? `notif_msg_${msgId}` : `notif_msg_${Date.now()}_${roomKey}`;
      const msgNotif = {
        id: notifId,
        messageId: msgId,
        type: 'message',
        title: senderName,
        message: textPreview,
        roomId: roomKey,
        sender: newMsg.sender,
        createdAt: newMsg.createdAt || new Date().toISOString(),
        unread: true
      };
      setNotifications((prev) => {
        // Prevent duplicate notification by id or messageId
        if (prev.some((n) => n.id === notifId || (msgId && n.messageId === msgId))) {
          return prev;
        }
        return [msgNotif, ...prev].slice(0, 50);
      });

      // 4. Show in-app banner toast notification with Open button
      showToast({
        text: `${senderName}: ${textPreview.slice(0, 50)}`,
        icon: '💬',
        roomId: roomKey
      }, 5000);

      // 5. Desktop / System notification (if backgrounded or minimized)
      showDesktopNotification(
        `💬 ${senderName}`,
        textPreview,
        roomKey,
        newMsg.sender?.avatar
      );
    };

    socket.on('receive_message', onReceive);
    socket.on('new_message_notification', (data) => {
      if (data?.message) onReceive(data.message);
    });

    return () => {
      socket.off('receive_message', onReceive);
      socket.off('new_message_notification');
    };
  }, [activeRoom, user]);

  // Reflect unread totals in the tab title
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    document.title = total > 0 ? `(${total}) ChatApp` : 'ChatApp';
  }, [unreadCounts]);

  // When the tab regains focus, clear unread for the open room (only while the
  // chat screen is actually visible — on mobile, that means mobileChatOpen)
  useEffect(() => {
    const onVisible = () => {
      const chatVisible = window.innerWidth >= 768 || mobileChatOpenRef.current;
      if (!document.hidden && activeRoom && chatVisible) {
        const roomKey = activeRoom._id || activeRoom.id;
        if (roomKey) {
          setUnreadCounts((prev) => {
            if (!prev[roomKey]) return prev;
            const next = { ...prev };
            delete next[roomKey];
            return next;
          });
          // Automatically clear notifications for this room when focused and visible
          setNotifications((prev) => prev.filter((n) => String(n.roomId) !== String(roomKey)));
          setToastMessage((curr) => (curr && curr.roomId === roomKey ? null : curr));
          markRoomAsRead(roomKey);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [activeRoom]);

  // Handle Select Room — must be declared BEFORE any ref/hook that uses it
  const handleSelectRoom = useCallback((room) => {
    // Private room: user must be a member OR the creator to enter directly.
    // Otherwise, open the join-code modal so they can enter the room code.
    if (room.isPrivate) {
      const userId = (user?._id || user?.id)?.toString();
      const memberIds = (room.members || []).map((m) => (m._id || m.id || m).toString());
      const isCreator = room.owner && (userId === (room.owner._id || room.owner)?.toString());
      const isMember = room.isMember === true || (userId && memberIds.includes(userId));

      if (!isMember && !isCreator) {
        setPendingJoinRoom(room);
        setIsJoinModalOpen(true);
        return;
      }
    }

    setActiveRoom(room);
    // On mobile, open the full-screen chat (Instagram-style slide)
    if (window.innerWidth < 768) {
      openMobileChat();
    }
    // Opening a room clears its unread count and automatically removes its notifications
    const roomKey = room._id || room.id;
    if (roomKey) {
      setUnreadCounts((prev) => {
        if (!prev[roomKey]) return prev;
        const next = { ...prev };
        delete next[roomKey];
        return next;
      });
      // Automatically clear notifications for this room when seen
      setNotifications((prev) => prev.filter((n) => String(n.roomId) !== String(roomKey)));
      setToastMessage((curr) => (curr && curr.roomId === roomKey ? null : curr));
      markRoomAsRead(roomKey);
    }

    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => (r._id || r.id) !== (room._id || room.id));
      return [room, ...filtered].slice(0, 10);
    });

    setJoinedRooms((prev) => {
      if (prev.some((r) => (r._id || r.id) === (room._id || room.id))) return prev;
      return [...prev, room];
    });
  }, [user, openMobileChat]);

  // Desktop notification click → navigate to the room
  const handleSelectRoomRef = useRef();
  handleSelectRoomRef.current = handleSelectRoom;

  useEffect(() => {
    const onNavigate = (e) => {
      const { roomId } = e.detail || {};
      if (!roomId) return;
      const target = rooms.find((r) => (r._id || r.id) === roomId) || joinedRooms.find((r) => (r._id || r.id) === roomId);
      if (target) {
        handleSelectRoomRef.current(target);
      }
    };
    window.addEventListener('chat-navigate', onNavigate);
    return () => window.removeEventListener('chat-navigate', onNavigate);
  }, [rooms, joinedRooms]);

  // Real-time listener: when a chat room is seen / active, automatically remove its notifications
  useEffect(() => {
    const onChatSeen = (e) => {
      const { roomId } = e.detail || {};
      if (roomId) {
        setNotifications((prev) => prev.filter((n) => String(n.roomId) !== String(roomId)));
        setUnreadCounts((prev) => {
          if (!prev[roomId]) return prev;
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
        setToastMessage((curr) => (curr && curr.roomId === roomId ? null : curr));
      }
    };
    window.addEventListener('chat-seen', onChatSeen);
    return () => window.removeEventListener('chat-seen', onChatSeen);
  }, []);

  // Click toast notification → navigate to the room
  const handleToastClick = async () => {
    if (!toastMessage) return;
    const roomId = typeof toastMessage === 'object' ? toastMessage.roomId : null;
    if (roomId) {
      let targetRoom = rooms.find((r) => (r._id || r.id) === roomId) ||
                       joinedRooms.find((r) => (r._id || r.id) === roomId) ||
                       recentRooms.find((r) => (r._id || r.id) === roomId);
      if (!targetRoom) {
        try {
          const res = await api.get(`/rooms/${roomId}`);
          targetRoom = res.data;
        } catch (e) {
          console.warn('Could not fetch room from toast', e);
        }
      }
      if (targetRoom) {
        setActiveTab('chats');
        handleSelectRoom(targetRoom);
      }
    }
    setToastMessage(null);
  };

  // Notification Section Handlers
  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleDismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleOpenRoomFromNotification = async (roomId, notifId) => {
    if (roomId) {
      // Automatically remove notifications for this room as it is now seen
      setNotifications((prev) => prev.filter((n) => String(n.roomId) !== String(roomId)));
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      markRoomAsRead(roomId);
    } else if (notifId) {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }
    let targetRoom = rooms.find((r) => (r._id || r.id) === roomId) ||
                     joinedRooms.find((r) => (r._id || r.id) === roomId) ||
                     recentRooms.find((r) => (r._id || r.id) === roomId);
    if (!targetRoom) {
      try {
        const res = await api.get(`/rooms/${roomId}`);
        targetRoom = res.data;
      } catch (e) {
        console.warn('Could not fetch room from notification', e);
      }
    }
    if (targetRoom) {
      setActiveTab('chats');
      handleSelectRoom(targetRoom);
    }
  };

  const handleAcceptFollowRequest = async (targetUserId, notifId) => {
    try {
      await api.post(`/users/${targetUserId}/accept-request`);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      showToast('Follow request accepted! You are now connected.');
    } catch (err) {
      showToast('Failed to accept follow request', 3000);
    }
  };

  const handleDeclineFollowRequest = async (targetUserId, notifId) => {
    try {
      await api.post(`/users/${targetUserId}/decline-request`);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      showToast('Follow request declined.');
    } catch (err) {
      showToast('Failed to decline follow request', 3000);
    }
  };

  // Handle Create Room
  const handleCreateRoom = async (newRoomData) => {
    try {
      const response = await api.post('/rooms', newRoomData);
      const createdRoom = { ...response.data, isMember: true };
      setRooms((prev) => [createdRoom, ...prev]);
      handleSelectRoom(createdRoom);
      showToast(`Room created · Code: ${createdRoom.code}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      showToast(`Error: ${msg}`);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (roomCode) => {
    try {
      const payload = { code: roomCode };
      if (pendingJoinRoom) {
        payload.roomId = pendingJoinRoom._id || pendingJoinRoom.id;
      }
      const response = await api.post('/rooms/join', payload);
      const joinedRoom = { ...response.data, isMember: true };
      const targetId = joinedRoom._id || joinedRoom.id;
      setRooms((prev) => {
        const exists = prev.some((r) => (r._id || r.id) === targetId);
        if (exists) {
          return prev.map((r) => ((r._id || r.id) === targetId ? { ...r, ...joinedRoom, isMember: true } : r));
        }
        return [joinedRoom, ...prev];
      });
      setPendingJoinRoom(null);
      handleSelectRoom(joinedRoom);
      showToast(`Joined room "${joinedRoom.name}"!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid room code';
      showToast(`Error: ${msg}`);
    }
  };

  // Real-time listener for deleted rooms
  useEffect(() => {
    const onRoomDeleted = ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setJoinedRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setRecentRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setActiveRoom((curr) => {
        if (curr && (curr._id || curr.id) === roomId) {
          if (window.innerWidth < 768) {
            setMobileChatOpen(false);
          }
          return null;
        }
        return curr;
      });
    };
    socket.on('room_deleted', onRoomDeleted);
    return () => socket.off('room_deleted', onRoomDeleted);
  }, []);

  // Handle Leave Room
  const handleLeaveRoom = async (roomId) => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
      setJoinedRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setRecentRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setActiveRoom(null);
      // Mobile: return to the rooms list screen after leaving
      if (window.innerWidth < 768) {
        setMobileChatOpen(false);
      }
      fetchRooms();
      showToast('You have left the room.');
    } catch (err) {
      console.error('[Leave Error] Failed to leave room:', err);
    }
  };

  // Handle Delete Room (Owner or admin only)
  const handleDeleteRoom = async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setJoinedRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setRecentRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setActiveRoom((curr) => {
        if (curr && (curr._id || curr.id) === roomId) {
          if (window.innerWidth < 768) {
            setMobileChatOpen(false);
          }
          return null;
        }
        return curr;
      });
      showToast('Room deleted successfully.');
    } catch (err) {
      console.error('[Delete Room Error]:', err);
      const msg = err.response?.data?.message || 'Failed to delete room';
      showToast(`Error: ${msg}`);
    }
  };

  // Filtered Rooms List
  const displayedRooms = (activeTab === 'joined' ? (joinedRooms.length > 0 ? joinedRooms : recentRooms) : rooms).filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.code && room.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || room.category === selectedCategory;
    const matchesTab =
      activeTab === 'public' ? !room.isPrivate :
      activeTab === 'private' ? Boolean(room.isPrivate) :
      true;
    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <div className={`gajim-window ${mobileChatOpen ? 'mobile-chat-open' : ''}`}>
      <div className="gajim-body">

        {/* Sidebar (Rooms list) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenJoinModal={() => setIsJoinModalOpen(true)}
          onOpenProfileSetup={() => setIsProfileSetupOpen(true)}
          recentRooms={recentRooms}
          rooms={displayedRooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
          onDeleteRoom={handleDeleteRoom}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          unreadCounts={unreadCounts}
          roomsLoading={roomsLoading}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          notifications={notifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onClearAllNotifications={handleClearAllNotifications}
          onDismissNotification={handleDismissNotification}
          onSelectRoomFromNotification={handleOpenRoomFromNotification}
          onAcceptFollowRequest={handleAcceptFollowRequest}
          onDeclineFollowRequest={handleDeclineFollowRequest}
          onRequestBrowserPermission={requestNotificationPermission}
          notificationPermissionStatus={typeof Notification !== 'undefined' ? Notification.permission : 'denied'}
        />

        {/* Main workspace (Chat screen) */}
        <main className="chat-panel">
          {activeTab === 'calls' ? (
            <CallHistoryPage />
          ) : activeTab === 'notifications' ? (
            <NotificationSection
              notifications={notifications}
              onClearAll={handleClearAllNotifications}
              onDismissNotification={handleDismissNotification}
              onOpenRoom={handleOpenRoomFromNotification}
              onAcceptRequest={handleAcceptFollowRequest}
              onDeclineRequest={handleDeclineFollowRequest}
              onRequestPermission={requestNotificationPermission}
              permissionStatus={typeof Notification !== 'undefined' ? Notification.permission : 'denied'}
            />
          ) : (
            <>
              {/* Active room */}
              {activeRoom ? (
                <ErrorBoundary>
                  <ChatWindow
                    room={activeRoom}
                    onLeaveRoom={handleLeaveRoom}
                    onDeleteRoom={handleDeleteRoom}
                    onBack={() => {
                      // Mobile: return to rooms list (keep chat state, don't unmount)
                      if (window.innerWidth < 768) {
                        closeMobileChat();
                      } else {
                        setActiveRoom(null);
                      }
                    }}
                    onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
                  />
                </ErrorBoundary>
              ) : (
                /* Empty state */
                <div className="empty-chat-state">
                  <div className="empty-chat-card" ref={emptyCardRef}>
                    <div className="empty-chat-glow" aria-hidden="true" />
                    <div className="empty-chat-illustration">
                      <div className="empty-chat-icon-ring">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="empty-chat-icon-svg">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="empty-chat-title">No Conversation Selected</h3>
                    <p className="empty-chat-sub">Choose a room from the channel list, or start a new public or private discussion space.</p>
                    <div className="empty-chat-actions">
                      <button
                        type="button"
                        className="btn-empty-action primary"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <span>+ Create New Room</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-action secondary"
                        onClick={() => setIsJoinModalOpen(true)}
                      >
                        <span>🔑 Join with Code</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="app-toast"
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16 }}>{typeof toastMessage === 'object' ? (toastMessage.icon || '💬') : '✨'}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typeof toastMessage === 'object' ? toastMessage.text : toastMessage}
            </span>
          </div>
          {typeof toastMessage === 'object' && toastMessage?.roomId && (
            <button
              type="button"
              onClick={handleToastClick}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--theme-primary, #6366f1)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Open Chat
            </button>
          )}
          <button
            className="btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              setToastMessage(null);
            }}
            aria-label="Dismiss"
            style={{ width: 28, height: 28, flexShrink: 0 }}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => { setPendingJoinRoom(null); setIsJoinModalOpen(false); }}
        onJoinRoom={handleJoinRoom}
        pendingRoom={pendingJoinRoom}
        roomName={pendingJoinRoom?.name}
        onDeleteRoom={handleDeleteRoom}
        currentUser={user}
      />
      <ProfileSetupModal
        isOpen={isProfileSetupOpen}
        onClose={() => setIsProfileSetupOpen(false)}
        onComplete={(updatedUser) => {
          showToast(`Profile & status updated successfully! Welcome, ${updatedUser?.fullName || updatedUser?.username || 'Chatter'} 🎉`);
        }}
      />
    </div>
  );
}
