import { SOCIAL_DOMAINS } from './social_domains.js';
import { LocusFocusAPI } from './backend-api.js';
// import { initFirebase } from './firebase.js'; // Firebase temporarily disabled

const STORAGE_KEYS = {
  BLOCK_ENABLED: 'blockEnabled',
  ULTRA_LOCK_UNTIL: 'ultraLockUntil',
  MUTUAL: 'mutual',
  BACKEND_ENABLED: 'backendEnabled',
  CUSTOM_DOMAINS: 'customDomains',
  LOCKED_BY: 'lockedBy',
  GROUP_INVITE: 'groupInvite'
};

const RULESET_ID = 20000;

async function getActiveDomains() {
  const { [STORAGE_KEYS.CUSTOM_DOMAINS]: customDomains } = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_DOMAINS);
  if (customDomains && Array.isArray(customDomains) && customDomains.length > 0) {
    return customDomains;
  }
  return SOCIAL_DOMAINS;
}

function buildRules() {
  let id = RULESET_ID;
  return SOCIAL_DOMAINS.map(domain => ({
    id: id++,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
    condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame", "sub_frame"] }
  }));
}

async function buildRulesFromDomains(domains) {
  let id = RULESET_ID;
  return domains.map(domain => ({
    id: id++,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
    condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame", "sub_frame"] }
  }));
}

async function enableBlocking() {
  const domains = await getActiveDomains();
  const rules = await buildRulesFromDomains(domains);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(r => r.id),
    addRules: rules
  });
}

async function disableBlocking() {
  const domains = await getActiveDomains();
  const rules = await buildRulesFromDomains(domains);
  const ids = rules.map(r => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
}

async function isUltraLocked(now = Date.now()) {
  const { [STORAGE_KEYS.ULTRA_LOCK_UNTIL]: until } = await chrome.storage.local.get(STORAGE_KEYS.ULTRA_LOCK_UNTIL);
  return typeof until === 'number' && now < until;
}

async function getState() {
  const data = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  return {
    blockEnabled: !!data[STORAGE_KEYS.BLOCK_ENABLED],
    ultraLockUntil: data[STORAGE_KEYS.ULTRA_LOCK_UNTIL] || null,
    mutual: data[STORAGE_KEYS.MUTUAL] || { enabled: false },
    backendEnabled: !!data[STORAGE_KEYS.BACKEND_ENABLED]
  };
}

async function setBlockEnabled(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.BLOCK_ENABLED]: enabled });
  if (enabled) await enableBlocking(); else await disableBlocking();
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'ultra-lock-check') {
    if (!(await isUltraLocked())) {
      await chrome.storage.local.set({ [STORAGE_KEYS.ULTRA_LOCK_UNTIL]: null });
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Ultra Lock finished',
        message: 'You\'re free! Social sites are no longer forcibly locked.'
      });
      chrome.alarms.clear('ultra-lock-check');
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'GET_STATE') {
      const state = await getState();
      state.effectiveLocked = await computeEffectiveLocked(state);
      sendResponse(state);
    }
    if (msg.type === 'GET_DOMAINS') {
      const domains = await getActiveDomains();
      sendResponse({ ok: true, domains });
    }
    if (msg.type === 'SAVE_DOMAINS') {
      const { domains } = msg;
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_DOMAINS]: domains });
      const state = await getState();
      if (state.blockEnabled) {
        await disableBlocking();
        await enableBlocking();
      }
      sendResponse({ ok: true });
    }
    if (msg.type === 'TOGGLE_BLOCK') {
      const state = await getState();
      if (await isUltraLocked()) { sendResponse({ ok: false, reason: 'ULTRA_LOCK_ACTIVE' }); return; }
      const next = !state.blockEnabled;
      await setBlockEnabled(next);
      sendResponse({ ok: true, blockEnabled: next });
    }
    if (msg.type === 'START_ULTRA_LOCK') {
      const { minutes } = msg;
      const until = Date.now() + Math.max(1, minutes) * 60 * 1000;
      await chrome.storage.local.set({ [STORAGE_KEYS.ULTRA_LOCK_UNTIL]: until });
      await setBlockEnabled(true);
      chrome.alarms.create('ultra-lock-check', { delayInMinutes: 1, periodInMinutes: 1 });
      sendResponse({ ok: true, until });
    }
    if (msg.type === 'CANCEL_ULTRA_LOCK') { sendResponse({ ok: false, reason: 'CANNOT_CANCEL_ULTRA_LOCK' }); }
    if (msg.type === 'SAVE_MUTUAL_SETTINGS') {
      const { enabled, userId, roomId, backendEnabled, backendUrl } = msg.payload;
      await chrome.storage.local.set({
        [STORAGE_KEYS.MUTUAL]: { enabled, userId, roomId },
        [STORAGE_KEYS.BACKEND_ENABLED]: !!backendEnabled,
        backendConfig: { url: backendUrl || 'http://localhost:3000' }
      });
      if (apiClient) {
        apiClient.disconnect();
        apiClient = null;
      }
      if (enabled && backendEnabled) {
        await ensureBackendAPI();
      }
      sendResponse({ ok: true });
    }
    if (msg.type === 'MUTUAL_REQUEST_LOCK') { const ok = await mutualRequestLock(); sendResponse({ ok }); }
    if (msg.type === 'UNLOCK_MYSELF') { 
      const res = await unlockMyself(); 
      sendResponse(res); 
    }
    if (msg.type === 'UNLOCK_FRIEND') { 
      const res = await unlockFriend(); 
      sendResponse(res); 
    }
    if (msg.type === 'GET_LOCK_STATUS') {
      const { lockedBy, mutual } = await chrome.storage.local.get([STORAGE_KEYS.LOCKED_BY, 'mutual']);
      sendResponse({ lockedBy, canUnlock: !lockedBy || lockedBy === mutual?.userId });
    }
    if (msg.type === 'CREATE_GROUP') {
      try {
        const { groupName, userId } = msg;
        const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        await chrome.storage.local.set({
          [STORAGE_KEYS.MUTUAL]: { enabled: true, userId, roomId: groupId, isOwner: true },
          [STORAGE_KEYS.BACKEND_ENABLED]: true
        });
        if (apiClient) {
          apiClient.disconnect();
          apiClient = null;
        }
        const api = await ensureBackendAPI();
        if (api) {
          await api.joinRoom(groupId, userId, userId);
        }
        sendResponse({ ok: true, groupId, inviteLink: groupId });
      } catch (error) {
        console.error('CREATE_GROUP error:', error);
        sendResponse({ ok: false, error: error.message });
      }
    }
    if (msg.type === 'JOIN_GROUP') {
      try {
        const { groupId, userId } = msg;
        
        // First, test backend connection
        const backendConfig = (await chrome.storage.local.get('backendConfig')).backendConfig;
        const backendUrl = backendConfig?.url || 'https://locusfocus-production.up.railway.app';
        
        // Test if backend is reachable
        try {
          const healthCheck = await fetch(`${backendUrl}/health`);
          if (!healthCheck.ok) {
            throw new Error('Backend server is not responding');
          }
        } catch (e) {
          throw new Error('Cannot connect to backend server. Check your internet connection.');
        }
        
        await chrome.storage.local.set({
          [STORAGE_KEYS.MUTUAL]: { enabled: true, userId, roomId: groupId, isOwner: false },
          [STORAGE_KEYS.BACKEND_ENABLED]: true
        });
        if (apiClient) {
          apiClient.disconnect();
          apiClient = null;
        }
        const api = await ensureBackendAPI();
        if (!api) {
          throw new Error('Failed to initialize backend connection');
        }
        
        await api.joinRoom(groupId, userId, userId);
        sendResponse({ ok: true, groupId });
      } catch (error) {
        console.error('JOIN_GROUP error:', error);
        sendResponse({ ok: false, error: error.message });
      }
    }
  })();
  return true;
});

let apiClient = null;

async function ensureBackendAPI() {
  const { [STORAGE_KEYS.BACKEND_ENABLED]: backendEnabled, backendConfig } = await chrome.storage.local.get([STORAGE_KEYS.BACKEND_ENABLED, 'backendConfig']);
  if (!backendEnabled) return null;
  if (apiClient) return apiClient;
  try {
    const baseURL = backendConfig?.url || 'http://localhost:3000';
    apiClient = new LocusFocusAPI(baseURL);
    
    const { mutual } = await chrome.storage.local.get('mutual');
    if (mutual?.roomId && mutual?.userId) {
      await apiClient.joinRoom(mutual.roomId, mutual.userId, mutual.userId);
      startBackendListener();
      startPolling(); // Start HTTP polling as WebSocket fallback
    }
    
    return apiClient;
  } catch (e) {
    console.error('Backend API init failed', e);
    return null;
  }
}

// HTTP polling as fallback for WebSocket
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) return; // Already polling
  
  pollingInterval = setInterval(async () => {
    try {
      const { mutual } = await chrome.storage.local.get('mutual');
      if (!mutual?.roomId || !apiClient) {
        stopPolling();
        return;
      }
      
      // Poll room state every 3 seconds
      const response = await fetch(`${apiClient.baseURL}/api/rooms/${mutual.roomId}/state`);
      if (response.ok) {
        const state = await response.json();
        await handleBackendMessage({ type: 'state', data: state });
      }
    } catch (error) {
      console.warn('Polling error:', error);
    }
  }, 3000); // Poll every 3 seconds
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function handleBackendMessage(data) {
  const { mutual } = await chrome.storage.local.get('mutual');
  if (!mutual?.enabled) return;
  
  // Handle both 'state' polling updates and 'lock_changed' WebSocket events
  if (data.type === 'state' && data.data?.locks) {
    const myLock = data.data.locks[mutual.userId];
    if (myLock) {
      const wasLocked = (await chrome.storage.local.get(STORAGE_KEYS.LOCKED_BY))[STORAGE_KEYS.LOCKED_BY];
      
      if (myLock.locked && myLock.lockedBy !== mutual.userId) {
        // Partner locked us
        if (!wasLocked || wasLocked !== myLock.lockedBy) {
          await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: myLock.lockedBy });
          await setBlockEnabled(true);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: 'Locked by partner',
            message: `${myLock.lockedBy} has locked your social media access.`
          });
        }
      } else if (!myLock.locked && wasLocked && wasLocked !== mutual.userId) {
        // Partner unlocked us
        await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: null });
        await setBlockEnabled(false);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Unlocked by partner',
          message: `Your partner has unlocked your access.`
        });
      }
    }
  }
  
  if (data.type === 'lock_changed' && data.state?.locks) {
    const myLock = data.state.locks[mutual.userId];
    
    if (myLock && myLock.lockedBy !== mutual.userId) {
      // Partner locked/unlocked us
      if (myLock.locked) {
        await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: myLock.lockedBy });
        await setBlockEnabled(true);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Locked by partner',
          message: `${myLock.lockedBy} has locked your social media access.`
        });
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: null });
        await setBlockEnabled(false);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Unlocked by partner',
          message: `${myLock.lockedBy} has unlocked your access.`
        });
      }
    }
  }
}

async function handlePartnerLockChange(data) {
  await handleBackendMessage(data);
}

async function mutualRequestLock() {
  const api = await ensureBackendAPI();
  if (!api) return false;
  
  const { mutual } = await chrome.storage.local.get('mutual');
  if (!mutual?.roomId || !mutual?.userId) return false;
  
  try {
    // Get room state to find all users
    const roomState = await api.getRoomState(mutual.roomId);
    
    // Lock yourself first
    await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: mutual.userId });
    await setBlockEnabled(true);
    
    // Lock all users in the room
    if (roomState?.users && Array.isArray(roomState.users)) {
      for (const user of roomState.users) {
        try {
          // Database returns user_id (snake_case), not userId (camelCase)
          const targetUserId = user.user_id || user.userId;
          if (targetUserId) {
            await api.setLock(mutual.roomId, targetUserId, mutual.userId, true);
          }
        } catch (err) {
          console.error(`Failed to lock user ${user.user_id || user.userId}:`, err);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('mutualRequestLock error:', error);
    return false;
  }
}

async function unlockMyself() {
  const api = await ensureBackendAPI();
  if (!api) return { ok: false, message: 'Backend not available' };
  
  const { mutual, lockedBy } = await chrome.storage.local.get(['mutual', STORAGE_KEYS.LOCKED_BY]);
  if (!mutual?.roomId || !mutual?.userId) {
    return { ok: false, message: 'Mutual lock not configured' };
  }
  
  // Can't unlock yourself if locked by partner
  if (lockedBy && lockedBy !== mutual.userId) {
    return { ok: false, reason: 'LOCKED_BY_PARTNER', message: 'You are locked by your partner' };
  }
  
  try {
    // Unlock yourself
    await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: null });
    await setBlockEnabled(false);
    
    await api.setLock(mutual.roomId, mutual.userId, mutual.userId, false);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Unlocked',
      message: 'You have unlocked yourself'
    });
    
    return { ok: true };
  } catch (error) {
    console.error('unlockMyself error:', error);
    return { ok: false, message: error.message };
  }
}

async function unlockFriend() {
  const api = await ensureBackendAPI();
  if (!api) return { ok: false, message: 'Backend not available' };
  
  const { mutual } = await chrome.storage.local.get('mutual');
  if (!mutual?.roomId || !mutual?.userId) {
    return { ok: false, message: 'Mutual lock not configured' };
  }
  
  try {
    // Get room state to find other users
    const roomState = await api.getRoomState(mutual.roomId);
    
    if (!roomState?.users || roomState.users.length < 2) {
      return { ok: false, message: 'No friends found in group' };
    }
    
    // Find other users (not yourself)
    const otherUsers = roomState.users.filter(user => {
      const userId = user.user_id || user.userId;
      return userId && userId !== mutual.userId;
    });
    
    if (otherUsers.length === 0) {
      return { ok: false, message: 'No friends found in group' };
    }
    
    // Unlock all friends
    let unlockedCount = 0;
    for (const user of otherUsers) {
      try {
        const targetUserId = user.user_id || user.userId;
        await api.setLock(mutual.roomId, targetUserId, mutual.userId, false);
        unlockedCount++;
      } catch (err) {
        console.error(`Failed to unlock user ${user.user_id || user.userId}:`, err);
      }
    }
    
    if (unlockedCount > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Friends Unlocked',
        message: `Unlocked ${unlockedCount} friend(s)`
      });
      return { ok: true, message: `Unlocked ${unlockedCount} friend(s)` };
    } else {
      return { ok: false, message: 'Failed to unlock friends' };
    }
  } catch (error) {
    console.error('unlockFriend error:', error);
    return { ok: false, message: error.message };
  }
}

async function mutualRequestUnlock(targetUserId) {
  const api = await ensureBackendAPI();
  if (!api) return false;
  
  const { mutual, lockedBy } = await chrome.storage.local.get(['mutual', STORAGE_KEYS.LOCKED_BY]);
  if (!mutual?.roomId || !mutual?.userId) return false;
  
  // If trying to unlock someone else
  if (targetUserId && targetUserId !== mutual.userId) {
    await api.setLock(mutual.roomId, targetUserId, mutual.userId, false);
    return { ok: true };
  }
  
  // Can't unlock yourself if locked by partner
  if (lockedBy && lockedBy !== mutual.userId) {
    return { ok: false, reason: 'LOCKED_BY_PARTNER' };
  }
  
  // Unlock yourself
  await chrome.storage.local.set({ [STORAGE_KEYS.LOCKED_BY]: null });
  await setBlockEnabled(false);
  
  await api.setLock(mutual.roomId, mutual.userId, mutual.userId, false);
  
  return { ok: true };
}

async function computeEffectiveLocked(state) {
  const ultra = await isUltraLocked();
  return ultra || state.blockEnabled;
}

function startBackendListener() {
  if (!apiClient) return;
  
  apiClient.onSnapshot(async (data) => {
    await handlePartnerLockChange(data);
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const initial = await getState();
  if (initial.blockEnabled) await enableBlocking();
  if (initial.mutual?.enabled && initial.backendEnabled) await ensureBackendAPI();
});
