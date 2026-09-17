import { apiFetch, setAuthToken } from "./apiClient";

export interface LoginPayload {
  admission_number?: string;
  email?: string;
  phone?: string;
  identifier?: string;
  password: string;
}

export interface StudentUserData {
  id: number | string;
  school_id: number | string;
  branch_id?: number | string;
  academic_year?: number | string;
  admission_number: string;
  admission_date?: string;
  roll_number?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  fullName?: string;
  class?: number | string;
  class_id?: number | string;
  section?: number | string;
  section_id?: number | string;
  class_name?: string;
  section_name?: string;
  gender?: number | string;
  gender_name?: string;
  date_of_birth?: string;
  blood_group?: number | string;
  blood_group_name?: string;
  house?: number | string;
  house_name?: string | null;
  religion?: number | string;
  religion_name?: string;
  category?: number | string;
  category_name?: string;
  primary_contact_number?: string;
  email_address?: string;
  picture?: string | null;
  school_name?: string;
  school_logo?: string | null;
  address_info?: any;
  token?: string;
}

export interface LoginResponseData {
  student: StudentUserData;
  token: string;
  school?: {
    id: number | string;
    name?: string;
    logo?: string | null;
  };
}

export interface LoginResponse {
  status: boolean;
  success: boolean;
  message: string;
  data: LoginResponseData;
}

export const authService = {
  /**
   * Student Login via Admission Number / Email / Phone and Password
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const ident = payload.admission_number || payload.email || payload.phone || payload.identifier || "";
    const res = await apiFetch("/student/auth/login", {
      method: "POST",
      body: JSON.stringify({
        admission_number: ident,
        email: ident,
        phone: ident,
        identifier: ident,
        password: payload.password,
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || "Login failed. Please check your credentials.");
    }

    const token = res.data.token;
    if (token) {
      setAuthToken(token);
    }

    return {
      status: true,
      success: true,
      message: res.message || "Student login successful.",
      data: res.data,
    };
  },

  /**
   * Request 6-digit Passcode for passwordless login
   */
  async requestPasscode(identifier: string) {
    const res = await apiFetch("/student/auth/request-passcode", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });

    if (!res.success) {
      throw new Error(res.message || "Failed to request passcode.");
    }

    return res.data;
  },

  /**
   * Verify 6-digit Passcode for passwordless login
   */
  async verifyPasscode(identifier: string, passcode: string): Promise<LoginResponse> {
    const res = await apiFetch("/student/auth/verify-passcode", {
      method: "POST",
      body: JSON.stringify({ identifier, passcode }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || "Passcode verification failed.");
    }

    const token = res.data.token;
    if (token) {
      setAuthToken(token);
    }

    return {
      status: true,
      success: true,
      message: res.message || "Login successful via passcode.",
      data: res.data,
    };
  },

  /**
   * Get currently authenticated student session
   */
  async getMe(): Promise<StudentUserData | null> {
    try {
      const res = await apiFetch("/student/auth/me", { method: "GET" });
      if (res.success && res.data?.student) {
        return res.data.student;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Change student account password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch("/student/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        oldPassword,
        newPassword,
        currentPassword: oldPassword,
        cur_pass: oldPassword,
        new_pass: newPassword,
      }),
    });

    if (!res.success) {
      throw new Error(res.message || "Failed to change password.");
    }

    return {
      success: true,
      message: res.message || "Password changed successfully.",
    };
  },

  /**
   * Logout student
   */
  async logout(): Promise<void> {
    try {
      await apiFetch("/student/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
    }
  },
};

export default authService;
