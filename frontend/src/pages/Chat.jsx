import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import ChatWindow from '../components/ChatWindow';
import CallHistoryPage from './CallHistoryPage';
import api from '../services/api';

export default function Chat() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);

  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'joined'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Responsive UI state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch all rooms from backend API
  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms');
      setRooms(response.data);
    } catch (err) {
      console.error('[Rooms Error] Failed to fetch rooms:', err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Handle Select Room
  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    setIsMobileSidebarOpen(false);

    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => (r._id || r.id) !== (room._id || room.id));
      return [room, ...filtered].slice(0, 10);
    });

    setJoinedRooms((prev) => {
      if (prev.some((r) => (r._id || r.id) === (room._id || room.id))) return prev;
      return [...prev, room];
    });
  };

  // Handle Create Room
  const handleCreateRoom = async (newRoomData) => {
    try {
      const response = await api.post('/rooms', newRoomData);
      const createdRoom = response.data;
      setRooms((prev) => [createdRoom, ...prev]);
      handleSelectRoom(createdRoom);
      showToast(`Room "${createdRoom.name}" created! Code: ${createdRoom.code}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      showToast(`Error: ${msg}`);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (roomCode) => {
    try {
      const response = await api.post('/rooms/join', { code: roomCode });
      const joinedRoom = response.data;
      setRooms((prev) => {
        const exists = prev.some((r) => (r._id || r.id) === (joinedRoom._id || joinedRoom.id));
        return exists ? prev : [joinedRoom, ...prev];
      });
      handleSelectRoom(joinedRoom);
      showToast(`Joined room "${joinedRoom.name}"!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid room code';
      showToast(`Error: ${msg}`);
    }
  };

  // Handle Leave Room
  const handleLeaveRoom = async (roomId) => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
      setJoinedRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setRecentRooms((prev) => prev.filter((r) => (r._id || r.id) !== roomId));
      setActiveRoom(null);
      fetchRooms();
      showToast('You have left the room.');
    } catch (err) {
      console.error('[Leave Error] Failed to leave room:', err);
    }
  };

  // Filtered Rooms List
  const displayedRooms = (activeTab === 'joined' ? joinedRooms : rooms).filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.code && room.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || room.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="gajim-window">
      <div className="gajim-body">

        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenJoinModal={() => setIsJoinModalOpen(true)}
          recentRooms={recentRooms}
          rooms={displayedRooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />

        {/* Main workspace */}
        <main className="chat-panel">
          {activeTab === 'calls' ? (
            <CallHistoryPage />
          ) : (
            <>
              {/* Active room */}
              {activeRoom ? (
                <ChatWindow
                  room={activeRoom}
                  onLeaveRoom={handleLeaveRoom}
                  onBack={() => setActiveRoom(null)}
                  onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
                />
              ) : (
                /* Empty state */
                <div className="empty-chat-state" style={{ background: 'var(--theme-chat-bg)' }}>
                  <div className="empty-chat-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h3 className="empty-chat-title">No chat selected</h3>
                  <p className="empty-chat-sub">Select a room from the sidebar to start chatting.</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 8 }}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + Create a Room
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="app-toast" role="status" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>✨</span>
            <span>{toastMessage}</span>
          </div>
          <button
            className="btn-icon"
            onClick={() => setToastMessage('')}
            aria-label="Dismiss"
            style={{ width: 28, height: 28 }}
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
        onClose={() => setIsJoinModalOpen(false)}
        onJoinRoom={handleJoinRoom}
      />
    </div>
  );
}
