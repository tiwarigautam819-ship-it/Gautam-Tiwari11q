/**
 * Centralized API & Cloud Configuration
 * Enables seamless communication from both Web browser and Android APK (Capacitor/Cordova/WebView)
 */

// Active Development URL (where the server is currently running)
export const CLOUD_BACKEND_URL = 'https://ais-dev-7b24itztw672ezfpthiy23-662494009338.asia-east1.run.app';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    // If running in browser served directly by the Cloud Run server or dev port:
    if (origin.includes('.run.app') || origin.includes('localhost:3000')) {
      return '';
    }
  }
  // When running inside an Android APK (capacitor://, file://, localhost, etc.)
  return CLOUD_BACKEND_URL;
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Returns a guaranteed absolute HTTPS URL suitable for opening in external mobile browsers (Chrome/Firefox/Samsung Internet)
 * or triggering native downloads from an Android APK / WebView.
 */
export function getAbsoluteBrowserUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return `${origin}${cleanPath}`;
    }
  }
  return `${CLOUD_BACKEND_URL}${cleanPath}`;
}
