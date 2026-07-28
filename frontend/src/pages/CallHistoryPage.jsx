import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';

export default function CallHistoryPage() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Voice, Video, Missed

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await api.get('/calls');
        setCalls(res.data);
      } catch (err) {
        console.error('Failed to fetch call history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (d.toDateString() === new Date().toDateString()) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredCalls = calls.filter(call => {
    if (filter === 'All') return true;
    if (filter === 'Voice') return call.type === 'voice';
    if (filter === 'Video') return call.type === 'video';
    if (filter === 'Missed') return call.status === 'missed';
    return true;
  });

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#181a20', color: '#6b7280' }}>
        Loading Call History...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#181a20', color: '#f3f4f6' }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #282c37', background: '#1c1f28' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px' }}>Call History</h1>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Voice', 'Video', 'Missed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#5865F2' : '#222530',
                color: filter === f ? '#fff' : '#9ca3af',
                border: filter === f ? 'none' : '1px solid #3f4657',
                borderRadius: 16,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollzone" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {filteredCalls.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📞</div>
            <h3>No recent calls found</h3>
            <p style={{ fontSize: 13 }}>Make a voice or video call to see it here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredCalls.map(call => {
              const isOutgoing = call.caller?._id === user?._id || call.caller?.id === user?.id;
              const otherUser = isOutgoing ? call.receiver : call.caller;
              const otherName = otherUser ? otherUser.username : 'Unknown User';
              
              const isMissed = call.status === 'missed';
              const icon = call.type === 'video' ? '📹' : '📞';
              
              let statusColor = '#9ca3af';
              if (isMissed) statusColor = '#ef4444';
              else if (isOutgoing) statusColor = '#10b981'; // green for outgoing successful
              else statusColor = '#3b82f6'; // blue for incoming successful
              
              return (
                <div key={call._id} className="call-history-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#222530', borderRadius: 12, border: '1px solid #2d3241', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', overflow: 'hidden' }}>
                      {otherUser?.avatar ? (
                         <img src={otherUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                         otherName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: isMissed ? '#ef4444' : '#f3f4f6' }}>
                        {otherName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                        <span style={{ color: statusColor, fontSize: 14 }}>
                          {isMissed ? '↙' : isOutgoing ? '↗' : '↙'}
                        </span>
                        <span>{formatDate(call.startTime)}</span>
                        <span>•</span>
                        <span>{call.room?.name || 'Private Room'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, color: '#d1d5db', fontWeight: 500 }}>{formatDuration(call.duration)}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{call.status}</div>
                    </div>
                    <div style={{ fontSize: 20, color: '#9ca3af' }}>{icon}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
