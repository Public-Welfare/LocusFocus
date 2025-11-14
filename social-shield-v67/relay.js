// Simple HTTP polling-based sync using JSONBin.io free tier
// More reliable than WebSockets for Chrome extensions

const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
const POLL_INTERVAL = 3000; // Check every 3 seconds

export class MutualLockRelay {
  constructor() {
    this.roomCode = null;
    this.userId = null;
    this.onLockChange = null;
    this.pollTimer = null;
    this.binId = null;
    this.lastState = null;
  }

  async connect(roomCode, userId, onLockChange) {
    this.roomCode = roomCode;
    this.userId = userId;
    this.onLockChange = onLockChange;
    
    // Use room code as storage key
    this.binId = `social-shield-${roomCode}`;
    
    console.log('Connected to room:', roomCode);
    
    // Start polling for updates
    this.startPolling();
  }

  startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    
    this.pollTimer = setInterval(() => {
      this.checkForUpdates();
    }, POLL_INTERVAL);
    
    // Check immediately
    this.checkForUpdates();
  }

  async checkForUpdates() {
    try {
      const data = await chrome.storage.sync.get(this.binId);
      const roomData = data[this.binId];
      
      if (roomData) {
        // Check if there's a lock/unlock for this user
        const myLock = roomData.locks?.[this.userId];
        
        if (myLock && myLock.timestamp > (this.lastState?.timestamp || 0)) {
          this.lastState = myLock;
          
          if (myLock.lockedBy !== this.userId && this.onLockChange) {
            // Partner locked/unlocked us
            this.onLockChange({
              userId: myLock.lockedBy,
              type: myLock.locked ? 'lock' : 'unlock',
              locked: myLock.locked,
              targetUserId: this.userId,
              timestamp: myLock.timestamp
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to check for updates:', e);
    }
  }

  async sendLockRequest(locked, targetUserId = null) {
    try {
      // Get current room data
      const data = await chrome.storage.sync.get(this.binId);
      const roomData = data[this.binId] || { locks: {} };
      
      // Update lock state for target user (or self)
      const target = targetUserId || this.userId;
      roomData.locks[target] = {
        locked: locked,
        lockedBy: this.userId,
        timestamp: Date.now()
      };
      
      // Save back to storage
      await chrome.storage.sync.set({ [this.binId]: roomData });
      
      console.log('Sent lock request:', { target, locked });
      return true;
    } catch (e) {
      console.error('Failed to send lock request:', e);
      return false;
    }
  }

  async sendUnlockRequest(targetUserId) {
    try {
      const data = await chrome.storage.sync.get(this.binId);
      const roomData = data[this.binId] || { locks: {} };
      
      roomData.locks[targetUserId] = {
        locked: false,
        lockedBy: this.userId,
        timestamp: Date.now()
      };
      
      await chrome.storage.sync.set({ [this.binId]: roomData });
      
      console.log('Sent unlock request for:', targetUserId);
      return true;
    } catch (e) {
      console.error('Failed to send unlock request:', e);
      return false;
    }
  }

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  isConnected() {
    return this.pollTimer !== null;
  }
}


