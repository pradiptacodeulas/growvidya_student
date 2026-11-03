import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let inMemoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const setOnUnauthorized = (cb: (() => void) | null): void => {
  onUnauthorizedCallback = cb;
};

const getHostFromExpo = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.hostUri;
  return hostUri ? hostUri.split(":")[0] : "localhost";
};

export const getServerBaseUrl = (): string => {
  const expoHost = getHostFromExpo();
  const envServerUrl = process.env.EXPO_PUBLIC_SERVER_URL?.trim();
  if (envServerUrl) {
    return envServerUrl.replace("localhost", expoHost).replace(/\/+$/, "");
  }
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envApiUrl) {
    return envApiUrl
      .replace("localhost", expoHost)
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/+$/, "");
  }
  return "";
};

export const getBaseApiUrl = (): string => {
  const expoHost = getHostFromExpo();
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envApiUrl) {
    return envApiUrl.replace("localhost", expoHost).replace(/\/+$/, "");
  }
  const serverBase = getServerBaseUrl();
  return serverBase ? `${serverBase}/api/v1` : "";
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
    ? `${base}/vidya_assets/images/female-user.png`
    : `${base}/vidya_assets/images/male-user.png`;

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
    return trimmed;
  }

  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

/**
 * Check if picture string points to a real uploaded avatar
 */
export const hasValidAvatar = (picture?: string | null): boolean => {
  if (!picture || typeof picture !== "string") return false;
  const trimmed = picture.trim().toLowerCase();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed.includes("placeholder") ||
    trimmed.includes("male-user.png") ||
    trimmed.includes("female-user.png")
  ) {
    return false;
  }
  return true;
};

/**
 * Generate avatar initials
 */
export const getNameInitials = (name?: string | null): string => {
  if (!name || typeof name !== "string") return "";
  const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return (words[0][0] + words[0][words[0].length - 1]).toUpperCase();
  }
  return words[0]?.[0]?.toUpperCase() || "";
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
    return trimmed;
  }
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const NON_ADMIN_SUBSCRIPTION_PAUSED_MSG =
  "School portal services are temporarily paused. Please contact your School Administration.";
const NON_ADMIN_FEATURE_DISABLED_MSG =
  "This module is currently not enabled for your school. Please contact your School Administration.";
const NON_ADMIN_STORAGE_FULL_MSG =
  "School cloud storage capacity has been reached. Please contact your School Administration.";

const SUBSCRIPTION_LOCK_CODES = new Set([
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_SUSPENDED",
  "SUBSCRIPTION_PENDING_APPROVAL",
  "SUBSCRIPTION_REQUIRED",
]);

const FEATURE_LOCK_CODES = new Set([
  "FEATURE_NOT_IN_PLAN",
  "FEATURE_NOT_INCLUDED",
]);

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

  if (text.includes("Request failed with status 402") || text.includes("status code 402")) {
    return NON_ADMIN_SUBSCRIPTION_PAUSED_MSG;
  }

  if (
    text.toLowerCase().includes("upgrade your") ||
    text.toLowerCase().includes("not included in your")
  ) {
    return NON_ADMIN_FEATURE_DISABLED_MSG;
  }

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
        } catch {}
      }
    }

    if (
      response.status === 401 &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("passcode")
    ) {
      inMemoryToken = null;
      await AsyncStorage.multiRemove(["@student_token", "@student_user"]).catch(() => {});
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    const isSuccess = response.ok && (json?.success === true || json?.status === true);
    const message = json?.message || (response.ok ? "Success" : `Request failed with status ${response.status}`);
    const data = json?.data !== undefined ? json.data : json;
    const errCode = json?.errors?.code || json?.code || null;

    if (!isSuccess) {
      let errMsg = cleanErrorMessage(message);
      if (response.status === 402 || (errCode && SUBSCRIPTION_LOCK_CODES.has(String(errCode)))) {
        errMsg = NON_ADMIN_SUBSCRIPTION_PAUSED_MSG;
      } else if (errCode && FEATURE_LOCK_CODES.has(String(errCode))) {
        errMsg = NON_ADMIN_FEATURE_DISABLED_MSG;
      } else if (errCode === "STORAGE_QUOTA_EXCEEDED") {
        errMsg = NON_ADMIN_STORAGE_FULL_MSG;
      }
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
