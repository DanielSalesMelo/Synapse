const AZURE_BACKEND_URL = "https://synapse-backend-ds2026.azurewebsites.net";
const INVALID_BACKEND_HOSTS = [
  "https://synapse-producion.up.railway.app",
  "https://synapse-backend.railway.app",
];

export function getBackendBaseUrl(): string {
  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001";
  }

  const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (configuredUrl && !INVALID_BACKEND_HOSTS.includes(configuredUrl)) {
    return configuredUrl;
  }

  return AZURE_BACKEND_URL;
}

export function getGoogleMapsApiKey(): string {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_FRONTEND_FORGE_API_KEY ||
    ""
  );
}
