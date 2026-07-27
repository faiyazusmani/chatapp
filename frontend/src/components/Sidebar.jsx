import { useAuth } from '../context/useAuth';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenJoinModal,
  recentRooms = [],
  onSelectRoom
}) {
  const { user, logout } = useAuth();

  return (
    <aside className="dashboard-sidebar">
      {/* User Profile Card */}
      <div className="sidebar-profile-card">
        <div className="avatar-wrapper">
          <img
            src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatUser'}
            alt={user?.username}
            className="user-avatar-img"
          />
          <span className="online-status-dot" title="Online"></span>
        </div>
        <div className="user-profile-info">
          <h4 className="user-display-name">{user?.username || 'Chatter'}</h4>
          <span className="user-email-text">{user?.email || 'user@chatroom.com'}</span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="sidebar-actions-group">
        <button className="btn-action-primary" onClick={onOpenCreateModal}>
          <span>+</span> Create Room
        </button>
        <button className="btn-action-secondary" onClick={onOpenJoinModal}>
          <span>🔑</span> Join Room
        </button>
      </div>

      {/* Navigation Filter Tabs */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">CHANNELS</div>
        <button
          className={`sidebar-nav-item ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <span>🌐</span> Explore Rooms
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === 'joined' ? 'active' : ''}`}
          onClick={() => setActiveTab('joined')}
        >
          <span>⭐</span> Joined Rooms
        </button>
      </nav>

      {/* Recent Rooms Quick Access */}
      <div className="sidebar-recent-section">
        <div className="nav-section-title">RECENT ROOMS</div>
        {recentRooms.length === 0 ? (
          <div className="empty-recent-text">No recent rooms</div>
        ) : (
          recentRooms.map((room) => (
            <button
              key={room.id || room.name}
              className="recent-room-item"
              onClick={() => onSelectRoom(room)}
            >
              <span className="room-hash">#</span>
              <span className="recent-room-name">{room.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Logout Footer */}
      <div className="sidebar-footer">
        <button className="btn-logout" onClick={logout}>
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
