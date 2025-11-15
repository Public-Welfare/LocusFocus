const THEME_KEY = 'locusfocus_theme';
function send(msg) { return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve)); }
function fmtTime(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60); const r = s % 60; return `${m}m ${r}s`; }

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.themeValue === theme);
  });
}

async function refresh() {
  const state = await send({ type: 'GET_STATE' });
  const lockStatus = await send({ type: 'GET_LOCK_STATUS' });
  
  const toggle = document.getElementById('toggle-block');
  const note = document.getElementById('block-note');

  toggle.checked = !!state.blockEnabled;
  const ulNow = Date.now();

  const ultraStatus = document.getElementById('ultra-status');
  const ultraActive = state.ultraLockUntil && ulNow < state.ultraLockUntil;
  if (ultraActive) {
    document.getElementById('start-ultra').disabled = true;
    document.getElementById('ultra-mins').disabled = true;
    const remain = state.ultraLockUntil - ulNow;
    ultraStatus.textContent = `Ultra Lock active — ${fmtTime(remain)} remaining.`;
  } else if (state.ultraLockUntil) {
    document.getElementById('start-ultra').disabled = false;
    document.getElementById('ultra-mins').disabled = false;
    ultraStatus.textContent = `Ultra Lock finished.`;
  } else {
    document.getElementById('start-ultra').disabled = false;
    document.getElementById('ultra-mins').disabled = false;
    ultraStatus.textContent = '';
  }

  if (ultraActive) { note.textContent = 'Toggle disabled while Ultra Lock is active.'; toggle.disabled = true; }
  else { toggle.disabled = false; note.textContent = state.blockEnabled ? 'Blocking is ON.' : 'Blocking is OFF.'; }

  const mstatus = document.getElementById('mutual-status');
  const lockFriendBtn = document.getElementById('lock-friend');
  const unlockMyselfBtn = document.getElementById('unlock-myself');
  const unlockFriendBtn = document.getElementById('unlock-friend');
  
  if (state.mutual?.enabled) { 
    mstatus.textContent = `Connected to room: ${state.mutual.roomId || 'unknown'}.`; 
    
    // Enable lock friend button always when connected
    lockFriendBtn.disabled = false;
    lockFriendBtn.style.opacity = '1';
    
    // Show lock status and enable/disable buttons based on who locked whom
    if (lockStatus?.lockedBy) {
      mstatus.textContent += ` Locked by ${lockStatus.canUnlock ? 'you' : 'partner'}.`;
      
      // Unlock Myself button - only enabled if I locked myself
      if (lockStatus.canUnlock) {
        unlockMyselfBtn.disabled = false;
        unlockMyselfBtn.style.opacity = '1';
      } else {
        unlockMyselfBtn.disabled = true;
        unlockMyselfBtn.style.opacity = '0.5';
        unlockMyselfBtn.title = 'You are locked by your partner';
      }
      
      // Unlock Friend button - check if friend is locked and if I locked them
      unlockFriendBtn.disabled = false;
      unlockFriendBtn.style.opacity = '1';
    } else {
      // Not locked
      unlockMyselfBtn.disabled = true;
      unlockMyselfBtn.style.opacity = '0.5';
      unlockFriendBtn.disabled = true;
      unlockFriendBtn.style.opacity = '0.5';
    }
    
    // Show group blocked domains
    const groupInfo = document.getElementById('group-info');
    const groupDomains = document.getElementById('group-domains');
    groupInfo.style.display = 'block';
    
    const domainsRes = await send({ type: 'GET_DOMAINS' });
    if (domainsRes?.ok && domainsRes.domains) {
      groupDomains.innerHTML = domainsRes.domains.slice(0, 10).join('<br>') + 
        (domainsRes.domains.length > 10 ? `<br><em>+${domainsRes.domains.length - 10} more...</em>` : '');
    }
  }
  else { 
    mstatus.textContent = 'Mutual Lock is not set up.'; 
    document.getElementById('group-info').style.display = 'none';
    lockFriendBtn.disabled = true;
    lockFriendBtn.style.opacity = '0.5';
    unlockMyselfBtn.disabled = true;
    unlockMyselfBtn.style.opacity = '0.5';
    unlockFriendBtn.disabled = true;
    unlockFriendBtn.style.opacity = '0.5';
  }
}

async function main() {
  const initialTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(initialTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue));
  });

  document.getElementById('toggle-block').addEventListener('change', async () => {
    const res = await send({ type: 'TOGGLE_BLOCK' });
    if (!res.ok && res.reason === 'ULTRA_LOCK_ACTIVE') { await refresh(); alert('Cannot change while Ultra Lock is active.'); return; }
    await refresh();
  });

  document.getElementById('start-ultra').addEventListener('click', async () => {
    const mins = parseInt(document.getElementById('ultra-mins').value, 10) || 30;
    const res = await send({ type: 'START_ULTRA_LOCK', minutes: mins });
    if (res.ok) await refresh();
  });

  document.getElementById('open-options').addEventListener('click', () => { chrome.runtime.openOptionsPage(); });
  document.getElementById('edit-domains-btn')?.addEventListener('click', () => { chrome.runtime.openOptionsPage(); });
  
  document.getElementById('mutual-lock').addEventListener('click', async () => {
    const res = await send({ type: 'MUTUAL_REQUEST_LOCK' }); 
    if (!res?.ok) alert('Configure Mutual Lock in Options first.');
    await refresh();
  });
  
  document.getElementById('lock-friend').addEventListener('click', async () => {
    const state = await send({ type: 'GET_STATE' });
    if (!state.mutual?.enabled) {
      alert('Configure Mutual Lock in Options first.');
      return;
    }
    
    const res = await send({ type: 'LOCK_FRIEND' }); 
    if (!res?.ok) {
      alert(res?.message || 'Failed to lock your friend.');
    }
    await refresh();
  });
  
  document.getElementById('unlock-myself').addEventListener('click', async () => {
    const state = await send({ type: 'GET_STATE' });
    if (!state.mutual?.enabled) {
      alert('Configure Mutual Lock in Options first.');
      return;
    }
    
    const res = await send({ type: 'UNLOCK_MYSELF' }); 
    if (!res?.ok) {
      if (res?.reason === 'LOCKED_BY_PARTNER') {
        alert('You are locked by your partner. Only they can unlock you.');
      } else {
        alert(res?.message || 'Failed to unlock yourself.');
      }
    }
    await refresh();
  });
  
  document.getElementById('unlock-friend').addEventListener('click', async () => {
    const state = await send({ type: 'GET_STATE' });
    if (!state.mutual?.enabled) {
      alert('Configure Mutual Lock in Options first.');
      return;
    }
    
    const res = await send({ type: 'UNLOCK_FRIEND' }); 
    if (!res?.ok) {
      alert(res?.message || 'Failed to unlock your friend.');
    }
    await refresh();
  });

  await refresh(); setInterval(refresh, 1000);
}
main();
