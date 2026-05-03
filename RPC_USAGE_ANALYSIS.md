# RPC Usage Analysis - PoRP Phases

## 🚨 **Critical RPC Usage Issues Identified**

### **High-Risk Areas for RPC Drain**

---

## 📊 **Phase-by-Phase Analysis**

### **PoRP Layer 1: ReadingTracker** ✅ **SAFE**
- **RPC Usage**: None
- **API Calls Only**: `/api/session/start`, `/api/session/verify`, `/api/challenge/get`, `/api/challenge/submit`
- **Assessment**: ✅ No direct RPC calls, uses HTTP APIs only

---

### **PoRP Layer 2: Comprehension Challenges** ✅ **SAFE**
- **RPC Usage**: None
- **API Calls Only**: Uses ReadingTracker's API methods
- **Assessment**: ✅ No direct RPC calls

---

### **PoRP Layer 3: WithdrawalReputationService** ✅ **SAFE**
- **RPC Usage**: None
- **API Calls Only**: `/api/prices` for token price conversion
- **Assessment**: ✅ Minimal API usage, no direct RPC calls

---

### **PoRP Layer 4: Advanced Features** ✅ **SAFE**
- **RPC Usage**: None
- **API Calls Only**: `/api/porp/leaderboard`, `/api/porp/user-stats`, `/api/porp/achievements`
- **Assessment**: ✅ No direct RPC calls

---

## 🚨 **HIGH-RISK COMPONENTS**

### **1. SendModal.js** ⚠️ **HIGH RPC USAGE**
**Critical Issues:**
- **Balance Fetching**: Called on every modal open and token change
- **Multiple RPC Calls**: `getBalance()`, `getAccount()`, `getAccountInfo()`, `getMinimumBalanceForRentExemption()`
- **No Caching**: Fresh RPC calls on every interaction
- **Retry Logic**: Up to 3 retries per failed call

**RPC Calls Identified:**
```javascript
// Called frequently - HIGH USAGE
await connection.getBalance(new PublicKey(activeWalletAddress))
await connection.getAccountInfo(ataAddress)
await getAccount(connection, ataAddress)
await connection.getMinimumBalanceForRentExemption(165)
await connection.getLatestBlockhash()
await connection.confirmTransaction()
```

**Impact**: ⚠️ **HIGH** - Every send modal interaction triggers multiple RPC calls

---

### **2. Chapter Page** ⚠️ **MODERATE RPC USAGE**
**Issues:**
- **Balance Checking**: Multiple balance fetch calls
- **Transaction Processing**: Multiple RPC calls per payment
- **ATA Checking**: `getMultipleAccountsInfo()` calls
- **Blockhash Fetching**: Called multiple times per transaction

**RPC Calls Identified:**
```javascript
// Moderate usage during payments
await connection.getMultipleAccountsInfo([creatorAta, sempaiHqAta, founderFundAta])
await connection.getBalance(userPublicKey)
await connection.getAccountInfo(ataAddress)
await connection.getLatestBlockhash()
await connection.getFeeForMessage(message)
await connection.confirmTransaction()
await connection.getSignatureStatus(signature)
```

**Impact**: ⚠️ **MODERATE** - RPC calls during payment processing

---

## 🎯 **Optimization Strategies**

### **1. Implement Balance Caching** 🚀 **HIGH PRIORITY**
```javascript
// Create balance cache service
class BalanceCache {
  constructor(ttl = 30000) { // 30 seconds cache
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async getBalance(address, token) {
    const key = `${address}-${token}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.balance;
    }
    
    // Fetch fresh balance
    const balance = await this.fetchBalanceFromRPC(address, token);
    this.cache.set(key, { balance, timestamp: Date.now() });
    return balance;
  }
}
```

### **2. Batch RPC Calls** 🚀 **HIGH PRIORITY**
```javascript
// Combine multiple account info calls
const accountInfos = await connection.getMultipleAccountsInfo([
  userAta,
  creatorAta, 
  sempaiHqAta,
  founderFundAta
]);
```

### **3. Debounce Balance Updates** 🚀 **MEDIUM PRIORITY**
```javascript
// Prevent rapid balance fetching
const debouncedFetchBalance = useMemo(
  () => debounce(fetchBalance, 1000),
  [fetchBalance]
);
```

### **4. Lazy Loading** 🚀 **MEDIUM PRIORITY**
```javascript
// Only fetch balance when modal is actually opened
useEffect(() => {
  if (isOpen && activeWalletAddress) {
    debouncedFetchBalance();
  }
}, [isOpen, activeWalletAddress]);
```

### **5. Connection Pooling** 🚀 **LOW PRIORITY**
```javascript
// Use shared connection instance
const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  httpHeaders: { "x-api-key": RPC_URL.split("=")[1] },
  fetchMiddleware: connectionFetchMiddleware
});
```

---

## 📈 **RPC Usage Monitoring**

### **Create RPC Usage Tracker**
```javascript
class RPCUsageTracker {
  constructor() {
    this.calls = new Map();
    this.limits = {
      'getBalance': 100,      // per minute
      'getAccountInfo': 50,   // per minute
      'confirmTransaction': 30 // per minute
    };
  }
  
  trackCall(method) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${method}-${minute}`;
    
    this.calls.set(key, (this.calls.get(key) || 0) + 1);
    
    if (this.calls.get(key) > this.limits[method]) {
      console.warn(`RPC usage limit exceeded for ${method}`);
      return false; // Block call
    }
    
    return true; // Allow call
  }
}
```

---

## 🔧 **Implementation Plan**

### **Phase 1: Critical Optimizations** (Immediate)
1. **Implement Balance Caching** - 30-second TTL for balance data
2. **Batch Account Info Calls** - Combine multiple ATA checks
3. **Debounce SendModal Balance Fetches** - Prevent rapid calls

### **Phase 2: Enhanced Caching** (1-2 days)
1. **Transaction Result Caching** - Cache recent transaction statuses
2. **Price Data Caching** - Cache token prices for longer periods
3. **User Data Caching** - Cache user reputation and stats

### **Phase 3: Monitoring & Limits** (3-5 days)
1. **RPC Usage Monitoring** - Track and limit RPC calls per user
2. **Connection Pool Management** - Optimize connection usage
3. **Rate Limiting** - Implement smart rate limiting

---

## 📊 **Expected Impact**

### **Before Optimization:**
- **SendModal**: 5-8 RPC calls per interaction
- **Chapter Page**: 8-12 RPC calls per payment
- **Total**: ~15-20 RPC calls per user action

### **After Optimization:**
- **SendModal**: 1-2 RPC calls per interaction (with caching)
- **Chapter Page**: 3-5 RPC calls per payment (with batching)
- **Total**: ~4-7 RPC calls per user action

### **RPC Reduction**: **~70% decrease** in RPC usage

---

## 🚨 **Immediate Actions Required**

### **1. Fix SendModal Balance Fetching** ⚠️ **URGENT**
```javascript
// Current: Fetches on every token change
useEffect(() => {
  if (isOpen && activeWalletAddress) {
    fetchBalance(); // ❌ Called too frequently
  }
}, [isOpen, activeWalletAddress, selectedToken]);

// Optimized: Debounced with caching
useEffect(() => {
  if (isOpen && activeWalletAddress) {
    debouncedFetchBalance(); // ✅ Controlled frequency
  }
}, [isOpen, activeWalletAddress]); // Remove selectedToken dependency
```

### **2. Cache Transaction Results** ⚠️ **URGENT**
```javascript
// Cache transaction confirmations
const txCache = new Map();
const getCachedTransaction = async (signature) => {
  if (txCache.has(signature)) {
    return txCache.get(signature);
  }
  
  const result = await connection.confirmTransaction(signature);
  txCache.set(signature, result);
  return result;
};
```

### **3. Batch Account Checks** ⚠️ **URGENT**
```javascript
// Replace multiple getAccountInfo calls
const accounts = await connection.getMultipleAccountsInfo([
  userAta,
  creatorAta,
  sempaiHqAta,
  founderFundAta
]);
```

---

## 🎯 **Implementation Priority**

1. **🚨 CRITICAL** - SendModal balance caching (immediate)
2. **⚠️ HIGH** - Chapter page batching (today)
3. **📈 MEDIUM** - RPC monitoring (this week)
4. **🔧 LOW** - Connection pooling (next week)

---

## 📋 **Summary**

- **PoRP Layers 1-4**: ✅ Safe (no direct RPC usage)
- **SendModal**: ⚠️ High RPC usage (needs immediate optimization)
- **Chapter Page**: ⚠️ Moderate RPC usage (needs optimization)
- **Potential RPC Reduction**: ~70% with proper caching
- **Implementation Time**: 1-2 weeks for full optimization

**🎯 Focus on SendModal optimization first - highest impact on RPC usage!**
