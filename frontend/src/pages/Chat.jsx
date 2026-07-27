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
      return [room, ...filtered].slice(0, 5);
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
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        recentRooms={recentRooms}
        onSelectRoom={handleSelectRoom}
      />

      {/* Main Dashboard Content */}
      <main className="dashboard-main">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--success)',
              color: '#6ee7b7',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontWeight: 600,
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>✨ {toastMessage}</span>
            <button
              onClick={() => setToastMessage('')}
              style={{ background: 'transparent', color: 'inherit', fontSize: '1.1rem' }}
            >
              &times;
            </button>
          </div>
        )}

        {activeRoom ? (
          /* Active Room Real-Time Chat Workspace */
          <ChatWindow
            room={activeRoom}
            onLeaveRoom={handleLeaveRoom}
            onBack={() => setActiveRoom(null)}
          />
        ) : (
          /* Rooms Explorer View */
          <div>
            <div className="dashboard-header">
              <div className="dashboard-title-row">
                <div>
                  <h1>{activeTab === 'joined' ? 'Your Joined Rooms' : 'Explore Chat Rooms'}</h1>
                  <p className="dashboard-subtitle">
                    {activeTab === 'joined'
                      ? 'Rooms you have recently entered and joined.'
                      : 'Discover open channels or create your own room to start chatting.'}
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="search-bar-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search rooms by name, code (e.g. ROOM-8DL7), or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter Pills */}
              <div className="category-tabs-container">
                {['All', 'General', 'Tech', 'Gaming', 'Music', 'Random'].map((category) => (
                  <button
                    key={category}
                    className={`category-tab-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Cards Grid */}
            {displayedRooms.length === 0 ? (
              <div className="no-rooms-placeholder">
                <h3>No Chat Rooms Found</h3>
                <p style={{ marginTop: '0.5rem' }}>
                  {searchQuery
                    ? `No rooms matched "${searchQuery}". Try searching by room code or clear filters.`
                    : 'No rooms available in this category yet. Be the first to create one!'}
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ width: 'auto', marginTop: '1.5rem', padding: '0.75rem 1.5rem' }}
                >
                  + Create Room
                </button>
              </div>
            ) : (
              <div className="rooms-grid">
                {displayedRooms.map((room) => (
                  <RoomCard key={room._id || room.id} room={room} onSelectRoom={handleSelectRoom} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

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
