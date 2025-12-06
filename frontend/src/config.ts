/**
 * API Configuration
 * Handles API base URL for both development and production environments
 */

// Get API base URL from environment variables or use empty string for relative URLs
// In development: Vite proxy forwards /api to localhost:8001
// In production: Kubernetes ingress routes /api to backend service
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                            import.meta.env.VITE_BACKEND_URL || 
                            '';

/**
 * Get full API URL for an endpoint
 * @param endpoint - API endpoint path (e.g., '/api/leaderboard')
 * @returns Full URL for the API call
 */
export const getApiUrl = (endpoint: string): string => {
  // If API_BASE_URL is set, use it; otherwise use relative path
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Make an API request with proper error handling
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Promise with response data
 */
export async function apiRequest<T = any>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  try {
    const url = getApiUrl(endpoint);
    console.log(`[API] Requesting: ${url}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[API] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// Export configuration for debugging
export const config = {
  API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
