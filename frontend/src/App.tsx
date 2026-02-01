import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Import API functions
import {
  createRoom,
  joinRoom,
  getRoomInfo,
  leaveRoom,
  sendMessage,
  getMessages,
  connectWebSocket,
  disconnectWebSocket
} from './api';
import { generateKey, encryptMessage, decryptMessage } from './utils/encryption';

interface Room {
  id: string;
  name: string;
  salt: string;
  userCount: number;
  created: string;
  expiresAt: string;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  encryptedMessage: string;
  iv: string;
  displayName: string;
  timestamp: string;
  decryptedMessage?: string;
  isJoinNotification?: boolean;
  isLeaveNotification?: boolean;
}

interface UserRoom {
  roomId: string;
  roomName: string;
  password: string;
  displayName: string;
  salt: string;
  userId?: string;
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [displayName, setDisplayName] = useState('Anonymous');
  const [userId, setUserId] = useState<string>('');
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [confirmRoomPassword, setConfirmRoomPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [confirmJoinPassword, setConfirmJoinPassword] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Room history is not saved - users start fresh on each session

    // Matrix rain effect
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const drawMatrix = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff41';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(drawMatrix, 50);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Loading screen timeout
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3500);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Custom cursor trail effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.9) {
        const trail = document.createElement('div');
        trail.style.position = 'fixed';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        trail.style.width = '2px';
        trail.style.height = '2px';
        trail.style.background = '#00ff41';
        trail.style.boxShadow = '0 0 5px #00ff41';
        trail.style.pointerEvents = 'none';
        trail.style.zIndex = '999';
        trail.style.animation = 'fadeOut 1s ease-out forwards';
        
        document.body.appendChild(trail);
        
        setTimeout(() => trail.remove(), 1000);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Random glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        document.body.style.filter = 'hue-rotate(180deg)';
        setTimeout(() => {
          document.body.style.filter = 'none';
        }, 50);
      }
    }, 3000);

    return () => clearInterval(glitchInterval);
  }, []);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && !currentRoom) {
      setShowJoinModal(true);
      setJoinRoomId(atob(roomParam));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [currentRoom]);

  const handleCreateRoom = async () => {
    // Validate passwords match
    if (roomPassword !== confirmRoomPassword) {
      setError('Passwords do not match');
      return;
    }
    if (roomPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    const newUserId = generateUserId();
    setError(null);
    try {
      const room = await createRoom(roomName, roomPassword, displayName, newUserId);

      // Update state - room history is not saved
      setUserRooms([...userRooms, {
        roomId: room.id,
        roomName: room.name,
        password: roomPassword,
        displayName,
        salt: room.salt,
        userId: newUserId
      }]);
      setCurrentRoom(room);
      setShowCreateModal(false);
      setError(null);

      // Connect to WebSocket
      connectWebSocket(room.id, newUserId, {
        onMessage: handleWebSocketMessage
      });

      // Load messages
      loadMessages(room.id);

      // Load room users
      const info = await getRoomInfo(room.id, newUserId);
      setRoomUsers(info.room.users || []);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room: ' + (error as Error).message);
    }
  };

  const handleJoinRoom = async () => {
    // Validate passwords match
    if (joinPassword !== confirmJoinPassword) {
      setError('Passwords do not match');
      return;
    }
    
    const newUserId = generateUserId();
    setError(null);
    try {
      const roomInfo = await joinRoom(joinRoomId, joinPassword, joinDisplayName, newUserId);

      // Update state - room history is not saved
      setUserRooms([...userRooms, {
        roomId: roomInfo.id,
        roomName: roomInfo.name,
        password: joinPassword,
        displayName: joinDisplayName,
        salt: roomInfo.salt,
        userId: newUserId
      }]);
      setCurrentRoom(roomInfo);
      setShowJoinModal(false);
      setError(null);

      // Connect to WebSocket
      connectWebSocket(roomInfo.id, newUserId, {
        onMessage: handleWebSocketMessage
      });

      // Load messages
      loadMessages(roomInfo.id);

      // Load room users
      const info = await getRoomInfo(roomInfo.id, newUserId);
      setRoomUsers(info.room.users || []);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room: ' + (error as Error).message);
    }
  };
  

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;

    try {
      await leaveRoom(currentRoom.id, generateUserId());

      // Update state - room history is not saved
      setUserRooms(userRooms.filter(room => room.roomId !== currentRoom.id));
      setCurrentRoom(null);
      setMessages([]);

      // Disconnect WebSocket
      disconnectWebSocket();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentRoom || !messageInput.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setError(null);
    try {
      // Find the room in userRooms to get the password and salt
      const userRoom = userRooms.find(r => r.roomId === currentRoom.id);
      if (!userRoom) {
        console.error('Room not found in userRooms');
        return;
      }

      // Generate encryption key from password and salt
      const key = await generateKey(userRoom.password, userRoom.salt);

      // Encrypt the message
      const { encryptedMessage, iv } = await encryptMessage(messageInput, key);

      // Send encrypted message
      await sendMessage(
        currentRoom.id,
        userRoom.userId || generateUserId(),
        encryptedMessage,
        iv
      );

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message: ' + (error as Error).message);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const userRoom = userRooms.find(r => r.roomId === roomId);
      const msgUserId = userRoom?.userId || generateUserId();
      const messages = await getMessages(roomId, msgUserId);
      
      if (userRoom && userRoom.password && userRoom.salt) {
        // Decrypt messages
        const key = await generateKey(userRoom.password, userRoom.salt);
        const decryptedMessages = await Promise.all(
          messages.map(async (msg: Message) => {
            try {
              const decrypted = await decryptMessage(msg.encryptedMessage, msg.iv, key);
              return { ...msg, decryptedMessage: decrypted };
            } catch (e) {
              console.error('Failed to decrypt message:', e);
              return { ...msg, decryptedMessage: '[Decryption failed]' };
            }
          })
        );
        setMessages(decryptedMessages);
      } else {
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleWebSocketMessage = async (wsMessage: any) => {
    if (wsMessage.type === 'new_message') {
      const msg = wsMessage.message;
      
      // Try to decrypt the message
      const userRoom = userRooms.find(r => r.roomId === currentRoom?.id);
      if (userRoom && userRoom.password && userRoom.salt && msg.encryptedMessage) {
        try {
          const key = await generateKey(userRoom.password, userRoom.salt);
          const decrypted = await decryptMessage(msg.encryptedMessage, msg.iv, key);
          msg.decryptedMessage = decrypted;
        } catch (e) {
          console.error('Failed to decrypt WebSocket message:', e);
          msg.decryptedMessage = '[Decryption failed]';
        }
      }
      
      setMessages(prev => [...prev, msg]);
    } else if (wsMessage.type === 'system') {
      setMessages(prev => [...prev, {
        id: 'system-' + Date.now(),
        roomId: currentRoom?.id || '',
        userId: 'system',
        encryptedMessage: '',
        iv: '',
        displayName: 'System',
        timestamp: new Date().toISOString(),
        decryptedMessage: wsMessage.message
      }]);
    } else if (wsMessage.type === 'user_joined') {
      // Show notification for user join
      setMessages(prev => [...prev, {
        id: 'join-' + Date.now(),
        roomId: currentRoom?.id || '',
        userId: 'system',
        encryptedMessage: '',
        iv: '',
        displayName: 'System',
        timestamp: new Date().toISOString(),
        decryptedMessage: `${wsMessage.displayName} joined the room`,
        isJoinNotification: true
      }]);
      // Fetch updated user list
      if (currentRoom) {
        try {
          const userRoom = userRooms.find(r => r.roomId === currentRoom.id);
          const wsUserId = userRoom?.userId || generateUserId();
          const info = await getRoomInfo(currentRoom.id, wsUserId);
          setRoomUsers(info.room.users || []);
        } catch (error) {
          console.error('Failed to update user list:', error);
        }
      }
    } else if (wsMessage.type === 'user_left') {
      // Show notification for user leave
      setMessages(prev => [...prev, {
        id: 'leave-' + Date.now(),
        roomId: currentRoom?.id || '',
        userId: 'system',
        encryptedMessage: '',
        iv: '',
        displayName: 'System',
        timestamp: new Date().toISOString(),
        decryptedMessage: `${wsMessage.displayName} left the room`,
        isLeaveNotification: true
      }]);
      // Fetch updated user list
      if (currentRoom) {
        try {
          const userRoom = userRooms.find(r => r.roomId === currentRoom.id);
          const wsUserId = userRoom?.userId || generateUserId();
          const info = await getRoomInfo(currentRoom.id, wsUserId);
          setRoomUsers(info.room.users || []);
        } catch (error) {
          console.error('Failed to update user list:', error);
        }
      }
    }
  };

  const handleSelectRoom = async (room: UserRoom) => {
    try {
      const roomInfo = await getRoomInfo(room.roomId, generateUserId());
      setCurrentRoom(roomInfo.room);
      setRoomUsers(roomInfo.room.users || []);

      // Connect to WebSocket
      connectWebSocket(room.roomId, generateUserId(), {
        onMessage: handleWebSocketMessage
      });

      // Load messages
      loadMessages(room.roomId);
    } catch (error) {
      console.error('Error selecting room:', error);
      // If room doesn't exist or user is not authorized, remove from state
      setUserRooms(userRooms.filter(r => r.roomId !== room.roomId));
    }
  };

  const handleShowUsers = () => {
    setShowUsersModal(true);
  };

  const handleShareRoom = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateUserId = (): string => {
    return 'user-' + Math.random().toString(36).substr(2, 9);
  };

  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="app">
      {/* Matrix Rain Background */}
      <canvas ref={canvasRef} id="matrix-canvas"></canvas>
      
      {/* Scanlines */}
      <div className="scanlines"></div>

      {/* Loading Screen */}
      <div id="loading-screen" className={loading ? '' : 'hidden'}>
        <div className="skull-container">
          <div className="skull">☠</div>
        </div>
        <div className="terminal-text">SHADOWLINK</div>
        <div className="loading-status">INITIALIZING SECURE CHANNEL...</div>
        <div className="terminal-progress">
          <div className="progress-line"><span className="ok">✓</span> Routing through TOR network...</div>
          <div className="progress-line"><span className="ok">✓</span> Establishing encrypted tunnel...</div>
          <div className="progress-line"><span className="ok">✓</span> Spoofing MAC address...</div>
          <div className="progress-line"><span className="warning">!</span> VPN status: <span className="warning">ACTIVE</span></div>
          <div className="progress-line"><span className="ok">✓</span> Connection secured. Welcome, Anonymous.</div>
        </div>
      </div>

      {/* Main App */}
      <div id="app-content" className={loading ? '' : 'visible'}>
        {/* Header */}
        <header className="header">
          <div className="logo-container">
            <div className="logo-skull">☠</div>
            <div className="logo glitch" data-text="SHADOWLINK">SHADOWLINK</div>
          </div>
          <div className="status-bar">
            <div className="status-item">
              <div className="status-indicator"></div>
              <span className="connection-status">CONNECTED</span>
            </div>
            <div className="status-item">
              <span className="vpn-status">⚠ TOR ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <div className="main-container">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="terminal-prompt">_</div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>CREATE CHANNEL</button>
            <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>JOIN CHANNEL</button>

            <div className="channel-section">
              <div className="channel-header">ACTIVE CHANNELS</div>
              <div className="channel-list">
                {userRooms.length === 0 ? (
                  <div className="channel-item">
                    <span>No active channels</span>
                  </div>
                ) : (
                  userRooms.map(room => (
                    <div key={room.roomId} className="channel-item" onClick={() => handleSelectRoom(room)}>
                      <span className="channel-icon">🔒</span>
                      <span>{room.roomName}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <main className="content">
            {!currentRoom ? (
              <div className="warning-box">
                <div className="warning-header">
                  <div className="warning-icon">⚠</div>
                  <h1 className="warning-title">UNAUTHORIZED ACCESS</h1>
                </div>
                
                <div className="terminal-content">
                  <div className="terminal-line">Welcome to the shadows, <span className="highlight">Anonymous</span>.</div>
                  <div className="terminal-line">This is an <span className="highlight">encrypted peer-to-peer communication network</span>.</div>
                  <div className="terminal-line">All traffic is routed through multiple encryption layers.</div>
                  
                  <div className="command-line">
                    $ Your IP: HIDDEN | Location: SPOOFED | Identity: ANONYMOUS
                  </div>
                  
                  <div className="terminal-line">Create a new secure channel or join an existing one.</div>
                  <div className="terminal-line"><span className="highlight">Remember:</span> Leave no trace. Trust no one.</div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>CREATE CHANNEL</button>
                  <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>JOIN CHANNEL</button>
                </div>

                <div className="disclaimer">
                  FOR EDUCATIONAL PURPOSES ONLY • USE AT YOUR OWN RISK • WE LOG NOTHING
                </div>
              </div>
            ) : (
              <div className="chat-container">
                <div className="chat-header">
                  <div className="room-info">
                    <h3>{currentRoom.name}</h3>
                    <div className="room-users-list">
                      <span className="users-label">ONLINE:</span>
                      {roomUsers.length > 0 ? (
                        roomUsers.map((user, index) => (
                          <span key={index} className="user-badge">{user.displayName}</span>
                        ))
                      ) : (
                        <span className="no-users">No users</span>
                      )}
                    </div>
                  </div>
                  <div className="room-actions">
                    <button className="btn btn-small" onClick={handleShowUsers}>Users</button>
                    <button className="btn btn-small" onClick={handleShareRoom}>Share</button>
                    <button className="btn btn-small btn-danger" onClick={handleLeaveRoom}>Leave</button>
                  </div>
                </div>
                
                <div className="messages-container">
                  {error && <div className="error-message">{error}</div>}
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`message ${message.isJoinNotification ? 'join-notification' : ''} ${message.isLeaveNotification ? 'leave-notification' : ''}`}
                    >
                      <span className="message-time">[{formatTime(message.timestamp)}]</span>
                      <strong>{message.displayName}:</strong> {message.decryptedMessage || message.encryptedMessage}
                    </div>
                  ))}
                </div>
                
                <div className="message-input-area">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                  />
                  <button className="btn btn-primary" onClick={handleSendMessage}>SEND</button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>CREATE NEW CHANNEL</h3>
              {error && <div className="error-message">{error}</div>}
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Channel Name"
              />
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="Password"
              />
              <input
                type="password"
                value={confirmRoomPassword}
                onChange={(e) => setConfirmRoomPassword(e.target.value)}
                placeholder="Confirm Password"
              />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
              />
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleCreateRoom}>CREATE</button>
                <button className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setError(null); }}>CANCEL</button>
              </div>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>JOIN CHANNEL</h3>
              {error && <div className="error-message">{error}</div>}
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Channel ID"
              />
              <input
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Password"
              />
              <input
                type="password"
                value={confirmJoinPassword}
                onChange={(e) => setConfirmJoinPassword(e.target.value)}
                placeholder="Confirm Password"
              />
              <input
                type="text"
                value={joinDisplayName}
                onChange={(e) => setJoinDisplayName(e.target.value)}
                placeholder="Your Display Name"
              />
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleJoinRoom}>JOIN</button>
                <button className="btn btn-secondary" onClick={() => { setShowJoinModal(false); setError(null); }}>CANCEL</button>
              </div>
            </div>
          </div>
        )}

        {/* Users Modal */}
        {showUsersModal && currentRoom && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Room Users</h3>
                <button className="modal-close" onClick={() => setShowUsersModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <p>Users currently in this room:</p>
                <ul className="users-list">
                  {roomUsers.map((user, index) => (
                    <li key={index}>{user.displayName}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Share Room Modal */}
        {showShareModal && currentRoom && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Share Room</h3>
                <button className="modal-close" onClick={() => setShowShareModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="share-details">
                  <div className="share-field">
                    <label>Room ID:</label>
                    <p className="share-password-display">{currentRoom.id}</p>
                  </div>
                  <div className="share-link-container">
                    <p>Shareable Link:</p>
                    <input
                      type="text"
                      id="share-link"
                      value={`${window.location.origin}/?room=${btoa(currentRoom.id)}`}
                      readOnly
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(`${window.location.origin}/?room=${btoa(currentRoom.id)}`)}
                    >
                      Copy Link
                    </button>
                  </div>
                  <div className="share-field">
                    <label>Room Password:</label>
                    <p className="share-password-display">
                      {userRooms.find(r => r.roomId === currentRoom.id)?.password || 'N/A'}
                    </p>
                  </div>
                </div>
                <p className="note">Share the link with others. The link includes the password for easy joining.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
