const logger = require('./logger');

/**
 * In-Memory Distributed/Local Execution Lock Manager
 * Prevents race conditions and duplicate concurrent execution attempts
 */
class ExecutionLock {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Generates a deterministic lock key for trade execution
   */
  getExecutionKey(userId, copyRuleId, transactionId, mode = 'TESTNET') {
    const u = String(userId || '').trim();
    const r = String(copyRuleId || '').trim();
    const t = String(transactionId || '').trim();
    return `lock:exec:${u}:${r}:${t}:${mode}`;
  }

  /**
   * Acquires a lock for a specific key
   * @param {string} key 
   * @param {number} [ttlMs=30000] - Time to live before automatic release
   * @returns {boolean} true if acquired, false if already locked
   */
  acquire(key, ttlMs = 30000) {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      logger.warn(`[LOCK] Failed to acquire lock for key '${key}'. Already locked by active worker.`);
      return false;
    }

    const expiresAt = now + ttlMs;
    const timeoutHandle = setTimeout(() => {
      this.release(key);
    }, ttlMs);

    // Unref so timer doesn't keep node process alive during shutdown/testing
    if (timeoutHandle.unref) {
      timeoutHandle.unref();
    }

    this.locks.set(key, {
      acquiredAt: now,
      expiresAt,
      timeoutHandle
    });

    return true;
  }

  /**
   * Releases a previously acquired lock
   * @param {string} key 
   */
  release(key) {
    const existing = this.locks.get(key);
    if (existing) {
      if (existing.timeoutHandle) {
        clearTimeout(existing.timeoutHandle);
      }
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Checks if a key is currently locked
   * @param {string} key 
   * @returns {boolean}
   */
  isLocked(key) {
    const now = Date.now();
    const existing = this.locks.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= now) {
      this.release(key);
      return false;
    }
    return true;
  }

  /**
   * Helper to execute an async function with lock acquisition and guaranteed release
   * @param {string} key 
   * @param {Function} fn 
   * @param {number} [ttlMs=30000]
   */
  async withLock(key, fn, ttlMs = 30000) {
    const acquired = this.acquire(key, ttlMs);
    if (!acquired) {
      const err = new Error(`Resource is currently locked by another concurrent process: ${key}`);
      err.code = 'DUPLICATE_EXECUTION';
      err.isLocked = true;
      throw err;
    }

    try {
      return await fn();
    } finally {
      this.release(key);
    }
  }

  /**
   * Clears all active locks
   */
  clear() {
    for (const [key, lock] of this.locks.entries()) {
      if (lock.timeoutHandle) {
        clearTimeout(lock.timeoutHandle);
      }
    }
    this.locks.clear();
  }
}

const instance = new ExecutionLock();
instance.ExecutionLock = ExecutionLock;
instance.getExecutionKey = instance.getExecutionKey.bind(instance);

module.exports = instance;
