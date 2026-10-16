/**
 * VessieOS Online System
 * Complete online functionality for GitHub Pages and cloud deployment
 */

class OnlineSystemManager {
  constructor(config = {}) {
    this.apiBase = config.apiBase || 'https://api.github.com';
    this.storageType = config.storageType || 'indexeddb'; // indexeddb or localStorage
    this.syncInterval = config.syncInterval || 30000;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.database = null;
    this.eventLog = [];
    this.users = [];
    this.data = new Map();
    this.init();
  }

  /**
   * Initialize online system
   */
  async init() {
    this.log('Initializing online system...');

    // Setup offline/online listeners
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());

    // Initialize storage
    await this.initStorage();

    // Start sync service
    this.startSync();

    this.log('✓ Online system initialized');
  }

  /**
   * Initialize storage (IndexedDB)
   */
  async initStorage() {
    if (this.storageType === 'indexeddb') {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('VessieOS', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          this.database = request.result;
          this.log('✓ IndexedDB initialized');
          resolve(this.database);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create object stores
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('posts')) {
            db.createObjectStore('posts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('messages')) {
            db.createObjectStore('messages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id' });
          }

          this.log('✓ Database schema created');
        };
      });
    }
  }

  /**
   * Save data to storage
   */
  async saveData(storeName, data) {
    if (this.storageType === 'indexeddb' && this.database) {
      return new Promise((resolve, reject) => {
        const tx = this.database.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(data);
      });
    } else {
      // Fallback to localStorage
      localStorage.setItem(`${storeName}_${data.id}`, JSON.stringify(data));
      return data;
    }
  }

  /**
   * Load data from storage
   */
  async loadData(storeName, id) {
    if (this.storageType === 'indexeddb' && this.database) {
      return new Promise((resolve, reject) => {
        const tx = this.database.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } else {
      const data = localStorage.getItem(`${storeName}_${id}`);
      return data ? JSON.parse(data) : null;
    }
  }

  /**
   * Sync data with server
   */
  async syncData() {
    if (!this.isOnline) {
      this.log('⚠ Offline - queuing sync');
      return;
    }

    this.log('Starting data sync...');

    try {
      for (let i = this.syncQueue.length - 1; i >= 0; i--) {
        try {
          await this.uploadData(this.syncQueue[i]);
          this.syncQueue.splice(i, 1);
        } catch (error) {
          this.log(`✗ Sync error: ${error.message}`);
        }
      }

      this.log(`✓ Sync complete (${this.syncQueue.length} items pending)`);
    } catch (error) {
      this.log(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Upload data to server
   */
  async uploadData(item) {
    const url = `${this.apiBase}/repos/VessieOS/data/contents/${item.storeName}/${item.id}.json`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${item.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update ${item.id}`,
        content: btoa(JSON.stringify(item.data)),
        branch: 'main'
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch data from server
   */
  async fetchServerData(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.log(`Fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue data for sync
   */
  queueForSync(storeName, data, token) {
    const item = {
      id: data.id,
      storeName,
      data,
      token,
      timestamp: Date.now()
    };

    this.syncQueue.push(item);
    this.log(`Queued for sync: ${storeName}/${data.id}`);
  }

  /**
   * Start sync service
   */
  startSync() {
    setInterval(() => this.syncData(), this.syncInterval);
  }

  /**
   * Online handler
   */
  onOnline() {
    this.isOnline = true;
    this.log('✓ Back online');
    this.syncData();
    
    document.dispatchEvent(new CustomEvent('online', {
      detail: { status: 'online' }
    }));
  }

  /**
   * Offline handler
   */
  onOffline() {
    this.isOnline = false;
    this.log('⚠ Going offline');
    
    document.dispatchEvent(new CustomEvent('offline', {
      detail: { status: 'offline' }
    }));
  }

  /**
   * Setup Service Worker for offline support
   */
  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/systems/online/sw.js');
        this.log('✓ Service Worker registered');
        return registration;
      } catch (error) {
        this.log(`Service Worker error: ${error.message}`);
      }
    }
  }

  /**
   * Create offline-first database
   */
  async createOfflineDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VessieOS_Offline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('cache', { keyPath: 'url' });
        db.createObjectStore('pending', { keyPath: 'id' });
      };
    });
  }

  /**
   * Cache API response
   */
  async cacheResponse(url, response) {
    const data = {
      url,
      content: response,
      timestamp: Date.now(),
      ttl: 3600000 // 1 hour
    };

    await this.saveData('cache', data);
  }

  /**
   * Get cached response
   */
  async getCachedResponse(url) {
    const cached = await this.loadData('cache', url);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.content;
    }

    return null;
  }

  /**
   * Sync notifications
   */
  async syncNotifications(userId) {
    try {
      const notifications = await this.fetchServerData(
        `/repos/VessieOS/data/contents/notifications/${userId}.json`
      );
      
      // Decode base64 content
      const content = JSON.parse(atob(notifications.content));
      return content;
    } catch (error) {
      this.log(`Error syncing notifications: ${error.message}`);
      return [];
    }
  }

  /**
   * Push notification to server
   */
  async pushNotification(userId, notification) {
    const item = {
      id: notification.id,
      storeName: 'notifications',
      data: notification
    };

    this.queueForSync(item.storeName, notification);
  }

  /**
   * Get online status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncQueueLength: this.syncQueue.length,
      storageType: this.storageType,
      database: this.database ? 'ready' : 'not initialized'
    };
  }

  /**
   * Export offline data
   */
  async exportOfflineData() {
    const data = {
      timestamp: new Date().toISOString(),
      status: this.getStatus(),
      syncQueue: this.syncQueue,
      eventLog: this.eventLog.slice(-100)
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Logging
   */
  log(message) {
    const entry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.eventLog.push(entry);
    console.log(`[Online] ${message}`);
  }

  /**
   * Get log
   */
  getLog(limit = 50) {
    return this.eventLog.slice(-limit);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnlineSystemManager;
}
