// API client for LocusFocus backend (replaces Firebase)
export class LocusFocusAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || 'https://locusfocus-production.up.railway.app';
    this.ws = null;
    this.listeners = new Map();
    this.roomId = null;
    this.userId = null;
  }

  // Join a room and establish WebSocket connection
  async joinRoom(roomId, userId, username) {
    try {
      // First, join via HTTP
      const response = await fetch(`${this.baseURL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to join room (${response.status})`);
      }

      const data = await response.json();
      
      this.roomId = roomId;
      this.userId = userId;

      // Establish WebSocket connection for real-time updates (non-blocking)
      this.connectWebSocket(roomId, userId).catch(err => {
        console.warn('WebSocket connection failed, will use polling instead:', err);
      });

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to backend server. Please check: 1) Internet connection 2) Backend server is running at ' + this.baseURL);
      }
      console.error('Join room error:', error);
      throw error;
    }
  }

  // Connect WebSocket for real-time updates
  async connectWebSocket(roomId, userId) {
    return new Promise((resolve, reject) => {
      try {
        const wsURL = this.baseURL.replace('http://', 'ws://').replace('https://', 'wss://');
        this.ws = new WebSocket(wsURL);

        this.ws.onopen = () => {
          // Join the room - add small delay to ensure connection is ready
          setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'join', roomId, userId }));
            }
          }, 100);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.warn('WebSocket connection failed (will continue without real-time updates):', error);
          // Don't reject - allow operation to continue without WebSocket
          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed, will use HTTP polling instead');
          // Don't auto-reconnect - polling will handle sync
        };
      } catch (error) {
        console.warn('WebSocket setup failed:', error);
        resolve(); // Continue without WebSocket
      }
    });
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    if (data.type === 'state' || data.type === 'lock_changed' || data.type === 'user_joined') {
      // Notify all listeners
      this.listeners.forEach(callback => {
        callback(data);
      });
    }
  }

  // Subscribe to room updates
  onSnapshot(callback) {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  // Get current room state
  async getRoomState(roomId) {
    try {
      const response = await fetch(`${this.baseURL}/api/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Room not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Get room state error:', error);
      throw error;
    }
  }

  // Set lock status
  async setLock(roomId, targetUserId, lockedByUserId, locked) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${this.baseURL}/api/rooms/${roomId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, lockedByUserId, locked }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('Failed to set lock');
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - backend server not responding');
      }
      console.error('Set lock error:', error);
      throw error;
    }
  }

  // Get lock status for a user
  async getLockStatus(roomId, userId) {
    try {
      const response = await fetch(`${this.baseURL}/api/rooms/${roomId}/locks/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get lock status');
      }
      return await response.json();
    } catch (error) {
      console.error('Get lock status error:', error);
      throw error;
    }
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'leave' }));
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.roomId = null;
    this.userId = null;
  }
}

// Helper function to initialize API client
export async function initBackendAPI() {
  const { backendConfig } = await chrome.storage.local.get('backendConfig');
  const baseURL = backendConfig?.url || 'https://locusfocus-production.up.railway.app';
  return new LocusFocusAPI(baseURL);
}
