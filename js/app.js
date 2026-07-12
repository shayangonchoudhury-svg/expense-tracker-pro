import { AppDB } from './database.js';
import { navigate } from './ui.js';
import { openCreatePasswordModal, openUnlockModal, verifyPassword } from './auth.js';
import { setupGestures } from './vault.js';

async function init() {
  try {
    await AppDB.init();
    console.log('App initialized');
    // Init navigation state on load
    navigate(location.pathname, false);
    setupGestures();

    // Check for master password
    const hashRecord = await AppDB.get('master_password_hash', 'master_hash');
    if (!hashRecord) {
      openCreatePasswordModal();
    } else {
      openUnlockModal();
    }
  } catch (e) {
    console.error('App init failed', e);
  }
}

document.addEventListener('DOMContentLoaded', init);
