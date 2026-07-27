import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/useAuth';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenJoinModal,
  recentRooms = [],
  rooms = [],
  activeRoom,
  onSelectRoom,
  searchQuery,
  setSearchQuery
}) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Derive initial/avatar from name
  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getRoomColor = (name) => {
    const colors = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#dc2626', '#db2777'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  const currentRoomsList = activeTab === 'joined' ? recentRooms : rooms;

  return (
    <aside style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      {/* ─── 1. Leftmost Workspace Sidebar (56px) ────────────────────── */}
      <div
        style={{
          width: 56,
          height: '100%',
          background: '#16181f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          borderRight: '1px solid #282c37',
          flexShrink: 0,
          gap: 12
        }}
      >
        {/* Top Gajim Status Buddy Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, color: '#22c55e' }}>🟢</span>
        </div>

        {/* Bell Notification */}
        <button
          title="Notifications"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16
          }}
        >
          🔔
        </button>

        {/* Separator */}
        <div style={{ width: 28, height: 1, background: '#282c37' }} />

        {/* Real Joined Rooms Workspace Icons */}
        <div className="scrollzone" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' }}>
          {recentRooms.map((room) => {
            const isSelected = activeRoom && (activeRoom._id || activeRoom.id) === (room._id || room.id);
            const bg = getRoomColor(room.name);
            return (
              <div key={room._id || room.id || room.name} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -8,
                      width: 4,
                      height: 24,
                      background: '#9333ea',
                      borderRadius: '0 4px 4px 0'
                    }}
                  />
                )}
                <button
                  title={room.name}
                  onClick={() => onSelectRoom(room)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: isSelected ? 12 : 19,
                    background: bg,
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 10px rgba(147, 51, 234, 0.5)' : 'none'
                  }}
                >
                  {getUserInitials(room.name)}
                </button>
              </div>
            );
          })}

          {/* Create / Join Room Action (+) */}
          <button
            title="Create or Join Room"
            onClick={onOpenCreateModal}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: '#222530',
              border: '1px dashed #3f4657',
              color: '#9ca3af',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            +
          </button>
        </div>

        {/* Bottom Actions: Collapse, Settings & Current User Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <button
            title="Collapse"
            style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer' }}
          >
            ❮
          </button>

          <button
            title="Settings / Join Room"
            onClick={onOpenJoinModal}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}
          >
            ⚙️
          </button>

          {/* Logged in User Avatar with Online Dot & Logout Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user?.username || 'User Profile'}
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#7c3aed',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {getUserInitials(user?.username || 'Chatter')}
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid #16181f'
                }}
              />
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 40,
                  left: 10,
                  background: '#1f222b',
                  border: '1px solid #2e3342',
                  borderRadius: 8,
                  padding: 8,
                  width: 140,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 100
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>
                  {user?.username}
                </div>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#f87171',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Second Conversation List Sidebar (290px) ────────────────── */}
      <div
        style={{
          width: 290,
          height: '100%',
          background: '#1c1f28',
          borderRight: '1px solid #282c37',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Workspace Title Header */}
        <div
          style={{
            height: 48,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #262a35'
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.01em' }}>
            test workspace
          </span>
          <button
            onClick={onOpenCreateModal}
            title="Room Settings"
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}
          >
            ⚙️
          </button>
        </div>

        {/* Search Row */}
        <div style={{ padding: '12px 14px 8px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12 }}>
                🔍
              </span>
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid #2d3241',
                  background: '#15171e',
                  color: '#d1d5db',
                  fontSize: 12,
                  padding: '0 8px 0 28px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setActiveTab(activeTab === 'explore' ? 'joined' : 'explore')}
              title={activeTab === 'explore' ? 'Showing All Rooms' : 'Showing Joined Rooms'}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #2d3241',
                background: activeTab === 'joined' ? 'rgba(147, 51, 234, 0.2)' : '#15171e',
                color: activeTab === 'joined' ? '#a855f7' : '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13
              }}
            >
              🎛️
            </button>

            {/* Add Button (+) */}
            <button
              onClick={onOpenCreateModal}
              title="Create Room"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                background: '#9333ea',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="scrollzone" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {currentRoomsList.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
              No rooms found. Click + to create one!
            </div>
          ) : (
            currentRoomsList.map((room) => {
              const isSelected = activeRoom && (activeRoom._id || activeRoom.id) === (room._id || room.id);
              const avatarBg = getRoomColor(room.name);
              return (
                <div
                  key={room._id || room.id || room.name}
                  onClick={() => onSelectRoom(room)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(147, 51, 234, 0.22)' : 'transparent',
                    marginBottom: 2,
                    transition: 'background 0.12s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Room Avatar Circle */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: avatarBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                      position: 'relative'
                    }}
                  >
                    {getUserInitials(room.name)}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: '1.5px solid #1c1f28'
                      }}
                    />
                  </div>

                  {/* Room Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#e5e7eb',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {room.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#6b7280', flexShrink: 0 }}>
                        {room.code ? `#${room.code}` : 'Just now'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9ca3af',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 160
                        }}
                      >
                        {room.description || `Code: ${room.code || 'OPEN'}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func,
  onOpenCreateModal: PropTypes.func,
  onOpenJoinModal: PropTypes.func,
  recentRooms: PropTypes.array,
  rooms: PropTypes.array,
  activeRoom: PropTypes.object,
  onSelectRoom: PropTypes.func,
  searchQuery: PropTypes.string,
  setSearchQuery: PropTypes.func
};
