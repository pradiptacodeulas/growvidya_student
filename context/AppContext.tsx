import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { dashboardService, DashboardData } from "../services/dashboardService";
import { assignmentService, AssignmentItem } from "../services/assignmentService";
import { messageService } from "../services/messageService";
import { connectSocket } from "../services/socket.service";
import { useAuth } from "./AuthContext";

interface AppContextType {
  dashboardData: DashboardData | null;
  loadingDashboard: boolean;
  dashboardError: string;
  apiAssignments: AssignmentItem[];
  loadingAssignments: boolean;
  unreadMessagesCount: number;
  activeChatKey: string | null;
  setActiveChatKey: (key: string | null) => void;
  fetchDashboard: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string>("");

  const [apiAssignments, setApiAssignments] = useState<AssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [activeChatKey, setActiveChatKey] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError("");
    try {
      const res = await dashboardService.getDashboardData();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      console.warn("Error loading dashboard data:", err);
      setDashboardError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const res = await assignmentService.getAssignments();
      if (res.success && Array.isArray(res.data)) {
        setApiAssignments(res.data);
      }
    } catch (err) {
      console.warn("Error loading assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadMessagesCount(count);
    } catch (err) {
      console.warn("Error loading unread count:", err);
    }
  }, []);

  // Initial load when token is present
  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchAssignments();
      fetchUnreadCount();
    }
  }, [token, fetchDashboard, fetchAssignments, fetchUnreadCount]);

  // Global real-time socket listeners for incoming messages & unread badges
  useEffect(() => {
    if (!token) return;

    let cleanup: (() => void) | null = null;

    const setupListeners = async () => {
      const socket = await connectSocket(token);
      if (!socket) return;

      const handleReceiveMessage = (msg: any) => {
        const senderRole = (msg?.sender_role || "teacher").toLowerCase();
        const senderId = Number(msg?.sender);
        const msgChatKey = `${senderRole}_${senderId}`;

        // Only increment unread badge if student is NOT currently chatting with this contact
        if (activeChatKey !== msgChatKey) {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      };

      const handleMessagesRead = () => {
        fetchUnreadCount();
      };

      const handleUnreadUpdated = () => {
        fetchUnreadCount();
      };

      socket.on("receive_message", handleReceiveMessage);
      socket.on("messages_read", handleMessagesRead);
      socket.on("unread_count_updated", handleUnreadUpdated);

      cleanup = () => {
        socket.off("receive_message", handleReceiveMessage);
        socket.off("messages_read", handleMessagesRead);
        socket.off("unread_count_updated", handleUnreadUpdated);
      };
    };

    setupListeners();

    return () => {
      if (cleanup) cleanup();
    };
  }, [token, activeChatKey, fetchUnreadCount]);

  return (
    <AppContext.Provider
      value={{
        dashboardData,
        loadingDashboard,
        dashboardError,
        apiAssignments,
        loadingAssignments,
        unreadMessagesCount,
        activeChatKey,
        setActiveChatKey,
        fetchDashboard,
        fetchAssignments,
        fetchUnreadCount,
        setUnreadMessagesCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
