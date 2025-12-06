# Production Issues & Fixes

## Issues Reported

1. **Leaderboard doesn't work in deployed version**
2. **Disconnect button not showing on top-right**

## Root Cause Analysis

### Issue 1: Leaderboard Not Loading

**Problem**: API calls are using relative URLs (`/api/leaderboard`) which work in local development via Vite proxy, but may have issues in production deployment.

**Why it works locally**:
- Vite dev server proxy forwards `/api` requests to `http://localhost:8001`

**Why it might fail in production**:
- Production build is served statically
- Kubernetes ingress should route `/api/*` to backend, but there may be timing/configuration issues
- Frontend build doesn't include proxy configuration

**Current Implementation**:
```typescript
// LeaderboardScene.ts:47
const response = await fetch(`/api/leaderboard?limit=100`);

// GameOverUIScene.ts:104
const response = await fetch(`/api/leaderboard?limit=10`);

// GameOverUIScene.ts:308  
const response = await fetch(`/api/leaderboard/submit`, {...});
```

### Issue 2: Disconnect Button Not Showing

**Problem**: Button is rendered but starts hidden, only shows when wallet connects.

**Current Logic**:
1. Button rendered with `hidden` class
2. `updateWalletDisplay()` called on scene creation
3. Button shows only if `getConnectedWallet()` returns a value
4. May not work if wallet state isn't persisted correctly

## Solutions

### Solution 1: Environment Variable for API URL (RECOMMENDED)

Since the deployment environment provides environment variables, we should respect them.

**Steps**:
1. The deployment system provides backend URL via environment variables
2. Frontend should check for these variables first, then fall back to relative URLs
3. This makes the app work in both local dev and production

**Implementation**:
Create a config file for API base URL that checks environment variables.

### Solution 2: Ensure Kubernetes Ingress Works

The Kubernetes ingress should automatically route:
- Frontend requests → port 3000
- `/api/*` requests → port 8001 (backend)

**Verify**:
- Backend is accessible at `/api/health`
- CORS is properly configured (already done: `allow_origins=["*"]`)
- Ingress rules are correctly applied

### Solution 3: Fix Disconnect Button Visibility

The button logic is correct, but we should:
1. Add console logging to debug wallet state
2. Ensure `localStorage.getItem('walletAddress')` persists across page loads
3. Check if Phantom wallet extension is available in production

## Quick Fixes to Apply

### Fix 1: Add API Configuration Helper

Create `/app/frontend/src/config.ts`:
```typescript
// Get API base URL from environment or use relative path
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                            import.meta.env.VITE_BACKEND_URL || 
                            '';

// For development, Vite proxy handles /api
// For production, Kubernetes ingress handles /api
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};
```

Then update all fetch calls to use:
```typescript
import { getApiUrl } from '../config';
const response = await fetch(getApiUrl('/api/leaderboard?limit=100'));
```

### Fix 2: Add Debug Logging for Wallet

In `TitleScreen.ts`, add logging:
```typescript
updateWalletDisplay(): void {
  const address = getConnectedWallet();
  console.log('[DEBUG] Wallet address:', address);
  console.log('[DEBUG] localStorage wallet:', localStorage.getItem('walletAddress'));
  
  // ... rest of code
}
```

### Fix 3: Ensure API Calls Work with Absolute URLs

For production deployments, if relative URLs don't work, we can use:
```typescript
// Get the current origin (e.g., https://your-app.emergent.host)
const API_BASE = window.location.origin;
const response = await fetch(`${API_BASE}/api/leaderboard`);
```

## Testing Checklist

- [ ] Check browser console for API errors (Network tab)
- [ ] Verify `/api/health` endpoint is accessible in production
- [ ] Check if disconnect button HTML element exists in DOM
- [ ] Verify localStorage has `walletAddress` after connection
- [ ] Test wallet connection flow end-to-end in production
- [ ] Verify leaderboard loads on page load
- [ ] Test score submission after wallet connection

## Expected Behavior

1. **Leaderboard Scene**:
   - Loads immediately when clicked
   - Shows "Loading..." initially
   - Fetches data from `/api/leaderboard`
   - Displays scores or "No scores yet"

2. **Disconnect Button**:
   - Hidden by default
   - Shows when wallet connects successfully
   - Positioned at top-right corner
   - Clicking disconnects wallet and hides button

3. **Game Over Scene**:
   - Shows top 10 leaderboard automatically
   - Auto-submits score if wallet is connected
   - Shows success message after submission

## Deployment Verification Commands

```bash
# Check if backend is running
curl https://your-app.emergent.host/api/health

# Check leaderboard endpoint
curl https://your-app.emergent.host/api/leaderboard

# Check stats
curl https://your-app.emergent.host/api/stats
```

## Next Steps

1. Apply Fix 1 (API configuration helper) - SAFEST
2. Test in production deployment
3. If still failing, apply Fix 3 (absolute URLs)
4. Add debug logging for wallet connection issues
5. Verify with actual Phantom wallet in production

## Notes

- The relative URL approach (`/api/...`) SHOULD work in production with proper Kubernetes ingress
- If it doesn't, it indicates an ingress configuration issue, not a code issue
- The disconnect button logic is correct; if not showing, it's because wallet isn't connecting
- All local tests pass, so the issue is environment-specific
