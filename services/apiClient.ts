import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const API_PORT = 5001;
const DEFAULT_API_URL = `http://localhost:${API_PORT}/api/v1`;

let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

/**
 * Resolve host IP dynamically from Expo manifest on real devices / emulators
 */
const getHostFromExpo = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.hostUri;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return null;
};

export const getBaseApiUrl = (): string => {
  // 1. On Native Devices running Expo Go / development client:
  if (Platform.OS !== "web") {
    const expoHost = getHostFromExpo();
    if (expoHost) {
      return `http://${expoHost}:${API_PORT}/api/v1`;
    }

    if (Platform.OS === "android") {
      return `http://10.0.2.2:${API_PORT}/api/v1`;
    }
  }

  // 2. Configured via environment variable
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (
    configured &&
    !configured.includes("growvidya.in") &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured.replace(/\/+$/, "").replace(":5000", `:${API_PORT}`);
  }

  // 3. Fallback (Web / Simulator)
  return DEFAULT_API_URL;
};

export const getServerBaseUrl = (): string => {
  return getBaseApiUrl().replace(/\/api\/v1\/?$/, "");
};

/**
 * Resolve full Avatar URL from file path
 */
export const getAvatarUrl = (
  picture?: string | null,
  gender?: string | number | null
): string => {
  const base = getServerBaseUrl();
  const isFemale =
    Number(gender) === 2 ||
    String(gender).trim().toLowerCase() === "female" ||
    String(gender).trim().toLowerCase() === "f";
  const defaultAvatar = isFemale
    ? `${base}/assets/images/female-user.png`
    : `${base}/assets/images/male-user.png`;

  if (!picture || typeof picture !== "string" || picture.trim() === "") {
    return defaultAvatar;
  }

  const trimmed = picture.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file:")
  ) {
    if (trimmed.includes("portal.growvidya.in/dev/")) {
      const pathPart = trimmed.split("portal.growvidya.in/dev/")[1]?.replace(/^\/+/, "");
      return `${base}/${pathPart}`;
    }
    if (trimmed.includes("via.placeholder.com")) {
      return defaultAvatar;
    }
    if (/http:\/\/[^/]+:(5000|5001)/.test(trimmed)) {
      return trimmed.replace(/http:\/\/[^/]+:(5000|5001)/, base);
    }
    return trimmed;
  }

  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

/**
 * Resolve full Document / Media URL
 */
export const getFileUrl = (filePath?: string | null): string => {
  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    return "";
  }
  const base = getServerBaseUrl();
  const trimmed = filePath.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file:")
  ) {
    if (trimmed.includes("portal.growvidya.in/dev/")) {
      const pathPart = trimmed.split("portal.growvidya.in/dev/")[1]?.replace(/^\/+/, "");
      return `${base}/${pathPart}`;
    }
    if (/http:\/\/[^/]+:(5000|5001)/.test(trimmed)) {
      return trimmed.replace(/http:\/\/[^/]+:(5000|5001)/, base);
    }
    return trimmed;
  }
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

/**
 * Format user-friendly error messages
 */
export const cleanErrorMessage = (
  msg: any,
  fallback = "An unexpected error occurred. Please try again."
): string => {
  if (!msg) return fallback;
  if (typeof msg !== "string") return String(msg);

  const text = msg.trim();

  if (
    text.includes("Unexpected token") ||
    text.includes("JSON at position") ||
    text.includes("unparseable response")
  ) {
    return "The server returned an unexpected response. Please check your connection and try again.";
  }

  if (
    text === "Network request failed" ||
    text === "Failed to fetch" ||
    text === "Network Error" ||
    text.includes("Network Error") ||
    text.includes("ERR_NETWORK") ||
    text.includes("ECONNREFUSED")
  ) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  if (text.includes("timeout") || text.includes("timed out") || text.includes("ECONNABORTED")) {
    return "The request timed out. Please check your internet connection and try again.";
  }

  if (/^(failed|error|failed!|error!|something went wrong|an error occurred)$/i.test(text)) {
    return fallback;
  }

  return text;
};

/**
 * Universal apiFetch with automatic token injection and timeout
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<{ success: boolean; message?: string; data?: any; error?: string; status: number }> => {
  const base = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith("http")
    ? endpoint
    : `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let token = inMemoryToken;
  if (!token) {
    try {
      const storedToken = await AsyncStorage.getItem("@student_token");
      if (storedToken) {
        token = storedToken;
        inMemoryToken = token;
      } else {
        const saved = await AsyncStorage.getItem("@student_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          token = parsed?.token || parsed?.access_token || parsed?.data?.token || null;
          if (token) {
            inMemoryToken = token;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cleanEndpoint, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          json = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
        } catch (_) {}
      }
    }

    const isSuccess = response.ok && (json?.success === true || json?.status === true);
    const message = json?.message || (response.ok ? "Success" : `Request failed with status ${response.status}`);
    const data = json?.data !== undefined ? json.data : json;

    if (!isSuccess) {
      const errMsg = cleanErrorMessage(message);
      return {
        success: false,
        message: errMsg,
        error: errMsg,
        data,
        status: response.status,
      };
    }

    return {
      success: true,
      message,
      data,
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const msg = "Request timed out. Please check your internet connection.";
      return { success: false, message: msg, error: msg, status: 408 };
    }
    const msg = cleanErrorMessage(error?.message);
    return { success: false, message: msg, error: msg, status: 0 };
  }
};

export const apiClient = {
  get: (endpoint: string, options: RequestInit = {}) =>
    apiFetch(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  put: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  patch: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  delete: (endpoint: string, options: RequestInit = {}) =>
    apiFetch(endpoint, { ...options, method: "DELETE" }),
};

export default apiClient;
