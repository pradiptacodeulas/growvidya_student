import { apiFetch } from "./apiClient";
import { StudentUserData } from "./authService";

export interface DashboardMetrics {
  attendancePercentage: number;
  presentDays: number;
  totalDays: number;
  dueAmount: number;
  paidAmount: number;
  totalFee: number;
  weeklyClassesCount: number;
  todayClassesCount: number;
  materialsCount: number;
  activitiesCount: number;
  totalAssignments: number;
  attemptedAssignments: number;
  pendingAssignments: number;
}

export interface TodayClass {
  id?: number | string;
  day?: number | string;
  day_id?: number | string;
  day_name?: string;
  period?: string;
  start_time?: string;
  end_time?: string;
  subject_name?: string;
  teacher_name?: string;
  room?: string;
}

export interface SchoolNotice {
  id: number | string;
  title: string;
  message: string;
  notice_date?: string;
  publish_on?: string;
  created_at?: string;
}

export interface SyllabusItem {
  id: number | string;
  school_id?: number;
  branch_id?: number | null;
  academic_year?: number | string;
  academic_year_code?: string;
  academic_year_name?: string;
  class_id?: number | string;
  class_name?: string;
  subject_id?: number | string;
  subject_name?: string;
  lession?: string;
  lesson?: string;
  status?: number | string;
  created_at?: string;
}

export interface HolidayItem {
  id: number | string;
  school_id?: number | string;
  branch_id?: number | string | null;
  branch_name?: string | null;
  title: string;
  from_date: string;
  to_date?: string;
  details?: string;
  status?: number | string;
  created_on?: string;
}

export interface DashboardData {
  student: StudentUserData;
  metrics: DashboardMetrics;
  todayClasses: TodayClass[];
  notices: SchoolNotice[];
  recentActivities: any[];
}

export interface DashboardResponse {
  status: boolean;
  success: boolean;
  data: DashboardData;
  message?: string;
}

const extractArray = (data: any, key?: string): any[] => {
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const dashboardService = {
  async getDashboardData(_token?: string): Promise<DashboardResponse> {
    const res = await apiFetch("/student/dashboard", { method: "GET" });
    if (!res.success || !res.data) {
      throw new Error(res.message || "Failed to fetch dashboard data.");
    }
    return {
      status: true,
      success: true,
      data: res.data,
      message: res.message,
    };
  },

  async getProfile(): Promise<StudentUserData> {
    const res = await apiFetch("/student/profile", { method: "GET" });
    if (!res.success || !res.data) {
      throw new Error(res.message || "Failed to fetch student profile.");
    }
    return res.data;
  },

  async getAttendance(month?: number, year?: number) {
    const query = [month ? `month=${month}` : "", year ? `year=${year}` : ""]
      .filter(Boolean)
      .join("&");
    const res = await apiFetch(`/student/attendance${query ? `?${query}` : ""}`, {
      method: "GET",
    });
    return res.data;
  },

  async getTimetable() {
    const res = await apiFetch("/student/timetable", { method: "GET" });
    return res.data;
  },

  async getExamResults() {
    const res = await apiFetch("/student/exam-results", { method: "GET" });
    return extractArray(res.data, "results");
  },

  async getSyllabus(params?: Record<string, string | number>): Promise<SyllabusItem[]> {
    const query = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    const res = await apiFetch(`/student/syllabus${query ? `?${query}` : ""}`, {
      method: "GET",
    });
    return extractArray(res.data, "syllabus");
  },

  async getStudyMaterials() {
    const res = await apiFetch("/student/study-materials", { method: "GET" });
    return extractArray(res.data, "materials");
  },

  async getActivities() {
    const res = await apiFetch("/student/activities", { method: "GET" });
    return extractArray(res.data, "activities");
  },

  async getTransport() {
    const res = await apiFetch("/student/transport", { method: "GET" });
    return res.data;
  },

  async getHostel() {
    const res = await apiFetch("/student/hostel", { method: "GET" });
    return res.data;
  },

  async getDocuments() {
    const res = await apiFetch("/student/documents", { method: "GET" });
    return extractArray(res.data, "documents");
  },

  async getNotices(): Promise<SchoolNotice[]> {
    const res = await apiFetch("/student/notices", { method: "GET" });
    return extractArray(res.data, "notices");
  },

  async getHolidays(): Promise<HolidayItem[]> {
    const res = await apiFetch("/student/holidays", { method: "GET" });
    return extractArray(res.data, "holidays");
  },
};

export default dashboardService;
