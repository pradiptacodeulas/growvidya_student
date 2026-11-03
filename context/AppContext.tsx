import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  dashboardService,
  DashboardData,
  SyllabusItem,
  HolidayItem,
  SchoolNotice,
} from "../services/dashboardService";
import { assignmentService, AssignmentItem } from "../services/assignmentService";
import { messageService } from "../services/messageService";
import { useAuth } from "./AuthContext";

interface AppContextType {
  dashboardData: DashboardData | null;
  loadingDashboard: boolean;
  dashboardError: string;
  apiAssignments: AssignmentItem[];
  loadingAssignments: boolean;
  apiSyllabus: SyllabusItem[];
  loadingSyllabus: boolean;
  apiHolidays: HolidayItem[];
  loadingHolidays: boolean;
  apiNotices: SchoolNotice[];
  loadingNotices: boolean;
  unreadMessagesCount: number;
  activeChatKey: string | null;
  setActiveChatKey: (key: string | null) => void;
  fetchDashboard: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchSyllabus: () => Promise<void>;
  fetchHolidays: () => Promise<void>;
  fetchNotices: () => Promise<void>;
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

  const [apiSyllabus, setApiSyllabus] = useState<SyllabusItem[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState<boolean>(false);

  const [apiHolidays, setApiHolidays] = useState<HolidayItem[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(false);

  const [apiNotices, setApiNotices] = useState<SchoolNotice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState<boolean>(false);

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

  const fetchSyllabus = useCallback(async () => {
    setLoadingSyllabus(true);
    try {
      const list = await dashboardService.getSyllabus();
      if (Array.isArray(list)) {
        setApiSyllabus(list);
      }
    } catch (err) {
      console.warn("Error loading syllabus:", err);
    } finally {
      setLoadingSyllabus(false);
    }
  }, []);

  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const list = await dashboardService.getHolidays();
      if (Array.isArray(list)) {
        setApiHolidays(list);
      }
    } catch (err) {
      console.warn("Error loading holidays:", err);
    } finally {
      setLoadingHolidays(false);
    }
  }, []);

  const fetchNotices = useCallback(async () => {
    setLoadingNotices(true);
    try {
      const list = await dashboardService.getNotices();
      if (Array.isArray(list)) {
        setApiNotices(list);
      }
    } catch (err) {
      console.warn("Error loading notices:", err);
    } finally {
      setLoadingNotices(false);
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

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchAssignments();
      fetchSyllabus();
      fetchHolidays();
      fetchNotices();
      fetchUnreadCount();
    } else {
      setDashboardData(null);
      setApiAssignments([]);
      setApiSyllabus([]);
      setApiHolidays([]);
      setApiNotices([]);
      setUnreadMessagesCount(0);
      setActiveChatKey(null);
      setDashboardError("");
    }
  }, [
    token,
    fetchDashboard,
    fetchAssignments,
    fetchSyllabus,
    fetchHolidays,
    fetchNotices,
    fetchUnreadCount,
  ]);

  return (
    <AppContext.Provider
      value={{
        dashboardData,
        loadingDashboard,
        dashboardError,
        apiAssignments,
        loadingAssignments,
        apiSyllabus,
        loadingSyllabus,
        apiHolidays,
        loadingHolidays,
        apiNotices,
        loadingNotices,
        unreadMessagesCount,
        activeChatKey,
        setActiveChatKey,
        fetchDashboard,
        fetchAssignments,
        fetchSyllabus,
        fetchHolidays,
        fetchNotices,
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
