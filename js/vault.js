import { AppDB } from './database.js';
import { navigate } from './ui.js';

let vaultUnlocked = false;
let decryptedVaultRecords = [];
let vaultCryptoKey = null;

// --- Encryption/Decryption ---
export async function getOrCreateSalt() {
  let saltRecord = await AppDB.get('app_settings', 'vault_salt');
  if (!saltRecord) {
    const randomSalt = crypto.getRandomValues(new Uint8Array(16));
    saltRecord = { key: 'vault_salt', value: Array.from(randomSalt) };
    await AppDB.put('app_settings', saltRecord);
  }
  return new Uint8Array(saltRecord.value);
}

export async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptRecord(record, key) {
  const encoder = new TextEncoder();
  const sensitiveData = {
    cashSavings: record.cashSavings || 0,
    onlineSavings: record.onlineSavings || 0,
    extraSavings: record.extraSavings || 0,
    emergencySavings: record.emergencySavings || 0,
    investments: record.investments || 0,
    goldSavings: record.goldSavings || 0,
    otherSavings: record.otherSavings || 0,
    notes: record.notes || ''
  };
  
  const plaintext = JSON.stringify(sensitiveData);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const ctHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { id: record.id, month: record.month, iv: ivHex, data: ctHex };
}

export async function decryptRecord(encryptedRecord, key) {
  try {
    if (!encryptedRecord.iv || !encryptedRecord.data) return encryptedRecord;
    const iv = new Uint8Array(encryptedRecord.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(encryptedRecord.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return { id: encryptedRecord.id, month: encryptedRecord.month, ...JSON.parse(new TextDecoder().decode(decrypted)) };
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}

// --- Gesture Handlers ---
export function setupGestures() {
  const footer = document.querySelector('footer');
  if (!footer) return;

  let pressTimer;
  footer.addEventListener('mousedown', () => pressTimer = setTimeout(() => openVault(), 2000));
  footer.addEventListener('mouseup', () => clearTimeout(pressTimer));
  footer.addEventListener('dblclick', () => openVault());
}

export async function openVault() {
  // Logic to show unlock modal or navigate to vault if already unlocked
  if (vaultUnlocked) {
    navigate('/vault');
  } else {
    // Show unlock modal (requires auth.js)
  }
}

export function lockVault() {
  vaultUnlocked = false;
  vaultCryptoKey = null;
  decryptedVaultRecords = [];
  navigate('/');
}
