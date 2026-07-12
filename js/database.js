export const DB_VERSION = 1;
export const DB_NAME_PROD = 'et_production_db';

export const AppDB = {
  db: null,
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME_PROD, DB_VERSION);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        const stores = [
          { name: 'transactions', keyPath: 'id' },
          { name: 'categories', keyPath: 'name' },
          { name: 'budgets', keyPath: 'month' },
          { name: 'analytics_cache', keyPath: 'key' },
          { name: 'monthly_reports', keyPath: 'month' },
          { name: 'savings_vault', keyPath: 'id' },
          { name: 'master_password_hash', keyPath: 'id' },
          { name: 'user_preferences', keyPath: 'key' },
          { name: 'theme_settings', keyPath: 'key' },
          { name: 'privacy_settings', keyPath: 'key' },
          { name: 'achievements', keyPath: 'id' },
          { name: 'app_settings', keyPath: 'key' }
        ];
        
        stores.forEach(s => {
          if (!db.objectStoreNames.contains(s.name)) {
            db.createObjectStore(s.name, { keyPath: s.keyPath });
          }
        });
      };
      
      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.migrateFromLocalStorage();
        resolve(this.db);
      };
      
      request.onerror = (e) => {
        console.error('IndexedDB initialization failed:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  async migrateFromLocalStorage() {
    const keysToMigrate = ['transactions', 'budgets', 'savings_vault'];
    for (const key of keysToMigrate) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    await this.putAll(key, parsed);
                } else {
                    await this.put(key, {id: key, ...parsed});
                }
                localStorage.removeItem(key);
                console.log(`Migrated ${key} to IndexedDB`);
            } catch (e) {
                console.error(`Migration failed for ${key}`, e);
            }
        }
    }
  },

  get(storeName, key) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  getAll(storeName) {
    return new Promise((resolve) => {
      if (!this.db) return resolve([]);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  put(storeName, item) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  delete(storeName, key) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  clearStore(storeName) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },
  
  putAll(storeName, items) {
    return new Promise((resolve) => {
      if (!this.db || !items.length) return resolve(true);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};

