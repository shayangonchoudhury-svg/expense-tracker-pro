import { navigate } from './ui.js';

export let sessionUnlocked = false;

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password) {
  const storedRecord = await import('./database.js').then(d => d.AppDB.get('master_password_hash', 'master_hash'));
  if (!storedRecord || !storedRecord.hash) return false;
  const inputHash = await hashPassword(password);
  return storedRecord.hash === inputHash;
}

export async function saveMasterPassword(password) {
  const hash = await hashPassword(password);
  return await import('./database.js').then(d => d.AppDB.put('master_password_hash', { id: 'master_hash', hash }));
}

export function setSessionUnlocked(status) {
  sessionUnlocked = status;
}

export function openCreatePasswordModal() {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  
  if (!modal || !content) return;
      
  content.innerHTML = `
    <div class="glass-modal p-6 rounded-3xl space-y-6">
      <h3 class="text-base font-extrabold text-slate-800 font-display">Create Master Password</h3>
      <input id="secNewPassword" type="password" placeholder="New Password" class="neu-input w-full p-2.5" />
      <input id="secConfirmPassword" type="password" placeholder="Confirm" class="neu-input w-full p-2.5" />
      <button id="saveSecPassword" class="neu-btn-primary w-full p-2.5 text-white font-bold">Set Password</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  document.getElementById('saveSecPassword').onclick = async () => {
    const p1 = document.getElementById('secNewPassword').value;
    const p2 = document.getElementById('secConfirmPassword').value;
    if (p1 === p2 && p1.length >= 8) {
      await saveMasterPassword(p1);
      modal.classList.add('hidden');
      setSessionUnlocked(true);
      navigate('/');
    }
  };
}

export function openUnlockModal() {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  
  if (!modal || !content) return;
  
  content.innerHTML = `
    <div class="glass-modal p-6 rounded-3xl space-y-6">
      <h3 class="text-base font-extrabold text-slate-800 font-display">Unlock Vault</h3>
      <input id="unlockPassword" type="password" placeholder="Password" class="neu-input w-full p-2.5" />
      <button id="unlockBtn" class="neu-btn-primary w-full p-2.5 text-white font-bold">Unlock</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  document.getElementById('unlockBtn').onclick = async () => {
    const p = document.getElementById('unlockPassword').value;
    let failedAttempts = parseInt(sessionStorage.getItem('failedAttempts') || '0', 10);

    if (await verifyPassword(p)) {
      sessionStorage.setItem('failedAttempts', '0');
      setSessionUnlocked(true);
      modal.classList.add('hidden');
      navigate('/');
    } else {
      failedAttempts++;
      sessionStorage.setItem('failedAttempts', failedAttempts.toString());
      
      const errorDiv = document.getElementById('authError') || document.createElement('div');
      errorDiv.id = 'authError';
      
      if (failedAttempts >= 3) {
        errorDiv.innerHTML = '<p class="font-bold text-red-600">An imposter is detected</p>';
      } else {
        errorDiv.innerHTML = '<p class="text-sm text-red-500">Wrong password</p>';
      }
      
      content.querySelector('div').appendChild(errorDiv);
    }
  };
}
