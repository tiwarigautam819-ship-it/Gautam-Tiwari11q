/**
 * Centralized API & Cloud Configuration
 * Enables seamless communication from both Web browser and Android APK (Capacitor/Cordova/WebView)
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    // When running in any standard web browser (hosted on Vercel, Firebase, Cloud Run, custom domain, etc.)
    if (origin && !origin.startsWith('capacitor://') && !origin.startsWith('file://')) {
      // If it's not a native Capacitor localhost shell
      if (!origin.includes('localhost') || origin.includes('localhost:3000')) {
        return '';
      }
    }
  }
  // Optional custom backend for native APK if configured via environment variable
  return (import.meta as any).env?.VITE_BACKEND_URL || '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Returns a clean absolute URL for opening in external browser or downloads.
 * Uses window.location.origin safely without hardcoding internal dev sandbox URLs.
 */
export function getAbsoluteBrowserUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return `${origin}${cleanPath}`;
    }
  }
  return cleanPath;
}
