import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import RoomCard from '../components/RoomCard';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import ChatWindow from '../components/ChatWindow';
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

    // Track recent room
    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => (r._id || r.id) !== (room._id || room.id));
      return [room, ...filtered].slice(0, 10);
    });

    // Track joined room
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

  // Handle Join Room using Room Code
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
      {/* Gajim Titlebar */}
      <div className="gajim-titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#22c55e' }}>🟢</span>
        </div>
        <div className="gajim-titlebar-title">Gajim</div>
        <div className="gajim-titlebar-controls">
          <button className="gajim-titlebar-btn" title="Help">?</button>
          <button className="gajim-titlebar-btn" title="Minimize">&minus;</button>
          <button className="gajim-titlebar-btn" title="Maximize">&#9633;</button>
          <button className="gajim-titlebar-btn" title="Close">&times;</button>
        </div>
      </div>

      {/* Gajim Desktop Main Body */}
      <div className="gajim-body">
        {/* Gajim 2-Column Sidebar */}
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
        />

        {/* Main Workspace Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(34, 197, 94, 0.15)',
                borderBottom: '1px solid #22c55e',
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>✨ {toastMessage}</span>
              <button
                onClick={() => setToastMessage('')}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
          )}

          {activeRoom ? (
            /* Active Real-Time Chat Workspace */
            <ChatWindow
              room={activeRoom}
              onLeaveRoom={handleLeaveRoom}
              onBack={() => setActiveRoom(null)}
            />
          ) : (
            /* Gajim Minimal Empty State */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#181a20', color: '#5a6278' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#8b92a5', margin: '0 0 8px' }}>No chat selected</h3>
              <p style={{ fontSize: 13, margin: 0 }}>Select a contact or room from the roster to start chatting.</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinRoom={handleJoinRoom}
      />
    </div>
  );
}
