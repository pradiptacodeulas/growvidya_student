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
  period?: string;
  start_time?: string;
  end_time?: string;
  subject_name?: string;
  teacher_name?: string;
  room?: string;
}

export interface SchoolNotice {
  id: number;
  title: string;
  message: string;
  notice_date: string;
  publish_on?: string;
  created_at?: string;
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

export const dashboardService = {
  /**
   * Fetch complete student dashboard metrics, today's timetable, and school notices
   */
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

  /**
   * Fetch full student profile with academic, address and facilities info
   */
  async getProfile(): Promise<StudentUserData> {
    const res = await apiFetch("/student/profile", { method: "GET" });
    if (!res.success || !res.data) {
      throw new Error(res.message || "Failed to fetch student profile.");
    }
    return res.data;
  },

  /**
   * Fetch student attendance records and summary
   */
  async getAttendance(month?: number, year?: number) {
    const query = [
      month ? `month=${month}` : "",
      year ? `year=${year}` : "",
    ].filter(Boolean).join("&");
    const endpoint = `/student/attendance${query ? `?${query}` : ""}`;
    const res = await apiFetch(endpoint, { method: "GET" });
    return res.data;
  },

  /**
   * Fetch class timetable / routine
   */
  async getTimetable() {
    const res = await apiFetch("/student/timetable", { method: "GET" });
    return res.data;
  },

  /**
   * Fetch exam results & marksheets
   */
  async getExamResults() {
    const res = await apiFetch("/student/exam-results", { method: "GET" });
    return res.data;
  },

  /**
   * Fetch study materials
   */
  async getStudyMaterials() {
    const res = await apiFetch("/student/study-materials", { method: "GET" });
    return res.data;
  },

  /**
   * Fetch student fees, invoices & receipts
   */
  async getFees() {
    const res = await apiFetch("/student/fees", { method: "GET" });
    return res.data;
  },

  /**
   * Fetch transport details
   */
  async getTransport() {
    const res = await apiFetch("/student/transport", { method: "GET" });
    return res.data;
  },

  /**
   * Fetch hostel details
   */
  async getHostel() {
    const res = await apiFetch("/student/hostel", { method: "GET" });
    return res.data;
  },
};

export default dashboardService;
