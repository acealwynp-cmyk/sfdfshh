import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

let walletAdapter: PhantomWalletAdapter | null = null;
let connectedWallet: string | null = null;

// Initialize wallet adapter
export function initWallet(): PhantomWalletAdapter {
  if (!walletAdapter) {
    walletAdapter = new PhantomWalletAdapter();
  }
  return walletAdapter;
}

// Connect to Phantom wallet
export async function connectWallet(): Promise<string | null> {
  try {
    const adapter = initWallet();
    
    if (!adapter.connected) {
      await adapter.connect();
    }
    
    if (adapter.publicKey) {
      connectedWallet = adapter.publicKey.toString();
      localStorage.setItem('walletAddress', connectedWallet);
      console.log('Connected to wallet:', connectedWallet);
      return connectedWallet;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
}

// Disconnect wallet
export async function disconnectWallet(): Promise<void> {
  try {
    const adapter = initWallet();
    
    if (adapter.connected) {
      await adapter.disconnect();
    }
    
    connectedWallet = null;
    localStorage.removeItem('walletAddress');
    console.log('Disconnected wallet');
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
}

// Get current connected wallet
export function getConnectedWallet(): string | null {
  if (connectedWallet) {
    return connectedWallet;
  }
  
  // Try to get from localStorage
  const storedWallet = localStorage.getItem('walletAddress');
  if (storedWallet) {
    connectedWallet = storedWallet;
    return connectedWallet;
  }
  
  // Try to get from adapter
  const adapter = initWallet();
  if (adapter.connected && adapter.publicKey) {
    connectedWallet = adapter.publicKey.toString();
    localStorage.setItem('walletAddress', connectedWallet);
    return connectedWallet;
  }
  
  return null;
}

// Check if wallet is connected
export function isWalletConnected(): boolean {
  return getConnectedWallet() !== null;
}

// Shorten wallet address for display (e.g., "7xKX...8Qm2")
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Auto-reconnect on page load
export async function autoReconnectWallet(): Promise<string | null> {
  const storedWallet = localStorage.getItem('walletAddress');
  
  if (storedWallet) {
    try {
      const adapter = initWallet();
      
      if (!adapter.connected) {
        await adapter.connect();
      }
      
      if (adapter.publicKey && adapter.publicKey.toString() === storedWallet) {
        connectedWallet = storedWallet;
        console.log('Auto-reconnected to wallet:', connectedWallet);
        return connectedWallet;
      }
    } catch (error) {
      console.log('Auto-reconnect failed:', error);
      localStorage.removeItem('walletAddress');
    }
  }
  
  return null;
}
