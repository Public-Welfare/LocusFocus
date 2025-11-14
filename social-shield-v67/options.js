const STORAGE_KEYS = {
  MUTUAL: 'mutual',
  BACKEND_ENABLED: 'backendEnabled',
  BACKEND_CONFIG: 'backendConfig',
  CUSTOM_DOMAINS: 'customDomains'
};
const THEME_KEY = 'locusfocus_theme';
const DEFAULT_BACKEND_URL = 'https://locusfocus-backend.up.railway.app';
function saveLocal(obj) { return chrome.storage.local.set(obj); }
function getLocal(keys) { return chrome.storage.local.get(keys); }
function el(id) { return document.getElementById(id); }
function send(msg) { return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve)); }

async function load() {
  const storedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(storedTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue));
  });

  const data = await getLocal([STORAGE_KEYS.MUTUAL, STORAGE_KEYS.BACKEND_CONFIG, STORAGE_KEYS.BACKEND_ENABLED]);
  const mutual = data[STORAGE_KEYS.MUTUAL] || {};
  el('userId').value = mutual.userId || '';
  
  const cfg = data[STORAGE_KEYS.BACKEND_CONFIG] || {};
  el('backendUrl').value = cfg.url || DEFAULT_BACKEND_URL;
  
  // Show current group status if connected
  if (mutual.enabled && mutual.roomId) {
    el('groupStatus').textContent = `Connected to group: ${mutual.roomId}`;
    el('groupStatus').style.color = '#059669';
  }
  
  const domainsRes = await send({ type: 'GET_DOMAINS' });
  if (domainsRes?.ok) {
    el('domains-list').value = domainsRes.domains.join('\n');
  }
  
  // Check if Ultra Lock is active or locked by partner
  const state = await send({ type: 'GET_STATE' });
  const lockStatus = await send({ type: 'GET_LOCK_STATUS' });
  const ulNow = Date.now();
  const ultraActive = state.ultraLockUntil && ulNow < state.ultraLockUntil;
  const lockedByPartner = lockStatus?.lockedBy && !lockStatus?.canUnlock;
  
  if (ultraActive || lockedByPartner) {
    // Disable domain editing during Ultra Lock or partner lock
    el('domains-list').disabled = true;
    el('save-domains').disabled = true;
    el('reset-domains').disabled = true;
    el('domains-list').style.opacity = '0.5';
    el('domains-list').style.cursor = 'not-allowed';
    
    if (ultraActive) {
      const remain = Math.ceil((state.ultraLockUntil - ulNow) / 60000);
      el('domains-status').textContent = `Cannot edit during Ultra Lock (${remain} min remaining)`;
    } else {
      el('domains-status').textContent = `Cannot edit while locked by partner`;
    }
    el('domains-status').style.color = '#d70015';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.themeValue === theme);
  });
}
async function save() {
  const cfg = {
    url: el('backendUrl').value.trim() || DEFAULT_BACKEND_URL
  };
  const backendEnabled = true; // Always enabled now
  await saveLocal({ [STORAGE_KEYS.BACKEND_CONFIG]: cfg, [STORAGE_KEYS.BACKEND_ENABLED]: backendEnabled });
  
  el('save-status').textContent = 'Saved.';
  setTimeout(() => { el('save-status').textContent = ''; }, 3000);
}

async function testConnection() {
  try {
    el('save-status').textContent = 'Testing backend connection...';
    const backendUrl = el('backendUrl').value.trim() || DEFAULT_BACKEND_URL;
    const response = await fetch(`${backendUrl}/health`);
    
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    
    const data = await response.json();
    el('save-status').textContent = data.status === 'ok' ? 'Backend connected ✅' : 'Backend connection failed';
  } catch (e) {
    console.error(e);
    el('save-status').textContent = 'Backend error. Using default Railway server: ' + DEFAULT_BACKEND_URL;
  }
}

async function createGroup() {
  const userId = el('userId').value.trim();
  if (!userId) {
    el('inviteLink').textContent = 'Please enter your name first.';
    el('inviteLink').style.color = '#d70015';
    return;
  }

  el('inviteLink').textContent = 'Creating group...';
  const res = await send({ type: 'CREATE_GROUP', userId, groupName: 'Group' });
  
  if (res?.ok) {
    const inviteCode = res.inviteLink;
    el('inviteLink').innerHTML = `
      <strong>Group created! Share this code:</strong><br>
      <input type="text" value="${inviteCode}" readonly style="margin-top: 8px; font-family: monospace; font-size: 14px;" onclick="this.select()">
      <br><small style="color: var(--muted);">Click to copy and share with friends</small>
    `;
    el('inviteLink').style.color = '#059669';
    el('groupStatus').textContent = `You created group: ${inviteCode}`;
    el('groupStatus').style.color = '#059669';
  } else {
    el('inviteLink').textContent = 'Failed to create group. Check backend connection.';
    el('inviteLink').style.color = '#d70015';
  }
}

async function joinGroup() {
  const userId = el('userId').value.trim();
  const groupCode = el('groupCode').value.trim();
  
  if (!userId) {
    el('groupStatus').textContent = 'Please enter your name first.';
    el('groupStatus').style.color = '#d70015';
    return;
  }
  
  if (!groupCode) {
    el('groupStatus').textContent = 'Please enter group invite code.';
    el('groupStatus').style.color = '#d70015';
    return;
  }

  el('groupStatus').textContent = 'Joining group...';
  const res = await send({ type: 'JOIN_GROUP', userId, groupId: groupCode });
  
  if (res?.ok) {
    el('groupStatus').textContent = `Successfully joined group: ${groupCode}`;
    el('groupStatus').style.color = '#059669';
    el('groupCode').value = '';
  } else {
    el('groupStatus').textContent = 'Failed to join group. Check the invite code.';
    el('groupStatus').style.color = '#d70015';
  }
}

async function saveDomains() {
  // Check if Ultra Lock is active or locked by partner
  const state = await send({ type: 'GET_STATE' });
  const lockStatus = await send({ type: 'GET_LOCK_STATUS' });
  const ulNow = Date.now();
  const ultraActive = state.ultraLockUntil && ulNow < state.ultraLockUntil;
  const lockedByPartner = lockStatus?.lockedBy && !lockStatus?.canUnlock;
  
  if (ultraActive || lockedByPartner) {
    el('domains-status').textContent = ultraActive 
      ? 'Cannot save domains during Ultra Lock.' 
      : 'Cannot save domains while locked by partner.';
    el('domains-status').style.color = '#d70015';
    return;
  }
  
  const text = el('domains-list').value;
  const domains = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
  
  if (domains.length === 0) {
    el('domains-status').textContent = 'Please enter at least one domain.';
    return;
  }
  
  const res = await send({ type: 'SAVE_DOMAINS', domains });
  if (res?.ok) {
    el('domains-status').textContent = `Saved ${domains.length} domains.`;
    el('domains-status').style.color = '#059669';
  } else {
    el('domains-status').textContent = 'Failed to save domains.';
  }
}

async function resetDomains() {
  // Check if Ultra Lock is active or locked by partner
  const state = await send({ type: 'GET_STATE' });
  const lockStatus = await send({ type: 'GET_LOCK_STATUS' });
  const ulNow = Date.now();
  const ultraActive = state.ultraLockUntil && ulNow < state.ultraLockUntil;
  const lockedByPartner = lockStatus?.lockedBy && !lockStatus?.canUnlock;
  
  if (ultraActive || lockedByPartner) {
    el('domains-status').textContent = ultraActive 
      ? 'Cannot reset domains during Ultra Lock.' 
      : 'Cannot reset domains while locked by partner.';
    el('domains-status').style.color = '#d70015';
    return;
  }
  
  await chrome.storage.local.remove(STORAGE_KEYS.CUSTOM_DOMAINS);
  const domainsRes = await send({ type: 'GET_DOMAINS' });
  if (domainsRes?.ok) {
    el('domains-list').value = domainsRes.domains.join('\n');
    el('domains-status').textContent = 'Reset to default domains.';
    el('domains-status').style.color = '#059669';
  }
}

document.getElementById('save').addEventListener('click', save);
document.getElementById('test').addEventListener('click', testConnection);
document.getElementById('createGroup').addEventListener('click', createGroup);
document.getElementById('joinGroup').addEventListener('click', joinGroup);
document.getElementById('save-domains').addEventListener('click', saveDomains);
document.getElementById('reset-domains').addEventListener('click', resetDomains);
load();
