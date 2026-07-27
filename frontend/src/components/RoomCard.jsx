export default function RoomCard({ room, onSelectRoom }) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Tech': return '💻';
      case 'Gaming': return '🎮';
      case 'Music': return '🎵';
      case 'Random': return '✨';
      default: return '💬';
    }
  };

  return (
    <div className="room-card" onClick={() => onSelectRoom(room)}>
      <div className="room-card-header">
        <span className="room-category-pill">
          {getCategoryIcon(room.category)} {room.category || 'General'}
        </span>
        {room.code && (
          <span className="room-code-badge" title="Room Code">
            {room.code}
          </span>
        )}
      </div>

      <h3 className="room-title">{room.name}</h3>
      <p className="room-description">
        {room.description || 'Welcome to this chat room. Connect with members in real-time.'}
      </p>

      <div className="room-card-footer">
        <span className="room-members-count">
          👥 {room.membersCount || (room.members ? room.members.length : 1)} {room.membersCount === 1 ? 'member' : 'members'}
        </span>
        <button
          className="btn-enter-room"
          onClick={(e) => {
            e.stopPropagation();
            onSelectRoom(room);
          }}
        >
          Enter Room &rarr;
        </button>
      </div>
    </div>
  );
}
