import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService, StudentUserData } from "../services/authService";
import { setAuthToken, setOnUnauthorized } from "../services/apiClient";
import { connectSocket, disconnectSocket } from "../services/socket.service";
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
} from "../services/notification.service";

const USER_STORAGE_KEY = "@student_user";
const TOKEN_STORAGE_KEY = "@student_token";

interface AuthContextType {
  user: StudentUserData | null;
  token: string | null;
  isLoading: boolean;
  login: (admissionNumber: string, password: string) => Promise<StudentUserData>;
  requestPasscode: (identifier: string) => Promise<any>;
  loginWithPasscode: (identifier: string, passcode: string) => Promise<StudentUserData>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<StudentUserData | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentUserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setOnUnauthorized(() => {
      disconnectSocket();
      setAuthToken(null);
      setUser(null);
      setToken(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  // Load persisted user & token from AsyncStorage on app boot
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedUserJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

        if (storedUserJson && storedToken) {
          const parsedUser: StudentUserData = JSON.parse(storedUserJson);
          setUser(parsedUser);
          setToken(storedToken);
          setAuthToken(storedToken);

          connectSocket(storedToken).catch(() => {});
          registerForPushNotificationsAsync().catch(() => {});
        }
      } catch (e) {
        console.warn("Failed to load stored auth data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (admission_number: string, password: string): Promise<StudentUserData> => {
    setIsLoading(true);
    try {
      const response = await authService.login({ admission_number, password });

      if (response.success && response.data) {
        const userData = response.data.student;
        const authToken = response.data.token;

        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, authToken);

        setAuthToken(authToken);
        setUser(userData);
        setToken(authToken);

        connectSocket(authToken).catch(() => {});
        registerForPushNotificationsAsync().catch(() => {});

        return userData;
      } else {
        throw new Error(response.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasscode = async (identifier: string): Promise<any> => {
    return await authService.requestPasscode(identifier);
  };

  const loginWithPasscode = async (identifier: string, passcode: string): Promise<StudentUserData> => {
    setIsLoading(true);
    try {
      const response = await authService.verifyPasscode(identifier, passcode);

      if (response.success && response.data) {
        const userData = response.data.student;
        const authToken = response.data.token;

        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, authToken);

        setAuthToken(authToken);
        setUser(userData);
        setToken(authToken);

        connectSocket(authToken).catch(() => {});
        registerForPushNotificationsAsync().catch(() => {});

        return userData;
      } else {
        throw new Error(response.message || "Passcode verification failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await unregisterPushToken().catch(() => {});
      await authService.logout();
    } catch {
      // ignore
    } finally {
      disconnectSocket();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setAuthToken(null);
      setUser(null);
      setToken(null);
    }
  };

  const refreshMe = async (): Promise<StudentUserData | null> => {
    try {
      const me = await authService.getMe();
      if (me) {
        setUser(me);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
        return me;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        requestPasscode,
        loginWithPasscode,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
