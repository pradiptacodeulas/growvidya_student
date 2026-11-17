import { apiFetch, setAuthToken } from "./apiClient";

export interface LoginPayload {
  admission_number?: string;
  email?: string;
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
   * Student Login via Email or Student ID (Admission Number) and Password
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const ident = (payload.admission_number || payload.email || payload.identifier || "").trim();
    const res = await apiFetch("/student/auth/login", {
      method: "POST",
      body: JSON.stringify({
        admission_number: ident,
        email: ident,
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
   * Request 6-digit Email OTP for passwordless login
   */
  async requestPasscode(identifier: string) {
    const res = await apiFetch("/student/auth/request-passcode", {
      method: "POST",
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

    if (!res.success) {
      const err: any = new Error(res.message || "Failed to request OTP.");
      err.emailMissing = Boolean(res.data?.errors?.emailMissing || res.data?.emailMissing);
      throw err;
    }

    return res.data;
  },

  /**
   * Verify 6-digit Email OTP for passwordless login
   */
  async verifyPasscode(identifier: string, passcode: string): Promise<LoginResponse> {
    const res = await apiFetch("/student/auth/verify-passcode", {
      method: "POST",
      body: JSON.stringify({
        identifier: identifier.trim(),
        passcode: passcode.trim(),
        otp: passcode.trim(),
      }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || "OTP verification failed.");
    }

    const token = res.data.token;
    if (token) {
      setAuthToken(token);
    }

    return {
      status: true,
      success: true,
      message: res.message || "Login successful via OTP.",
      data: res.data,
    };
  },

  /**
   * Step 1: Request Forgot Password 6-digit Email OTP
   */
  async requestForgotPasswordOtp(identifier: string) {
    const res = await apiFetch("/student/auth/forgot-password/request-otp", {
      method: "POST",
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

    if (!res.success) {
      const err: any = new Error(res.message || "Failed to send password reset OTP.");
      err.emailMissing = Boolean(res.data?.errors?.emailMissing || res.data?.emailMissing);
      throw err;
    }

    return res.data;
  },

  /**
   * Step 2: Verify Forgot Password 6-digit Email OTP
   */
  async verifyForgotPasswordOtp(identifier: string, otp: string) {
    const res = await apiFetch("/student/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier: identifier.trim(), otp: otp.trim() }),
    });

    if (!res.success || !res.data?.resetToken) {
      throw new Error(res.message || "Invalid or expired OTP.");
    }

    return res.data;
  },

  /**
   * Step 3: Reset Password using resetToken
   */
  async resetPassword(payload: { resetToken: string; newPassword: string; confirmPassword: string }) {
    const res = await apiFetch("/student/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.success) {
      throw new Error(res.message || "Failed to reset password.");
    }

    return res;
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
   * Request 6-digit Email OTP before changing student password
   */
  async requestChangePasswordOtp(oldPassword: string, newPassword: string) {
    const res = await apiFetch("/student/auth/change-password/request-otp", {
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
      const err: any = new Error(res.message || "Failed to send verification OTP.");
      err.emailMissing = Boolean(res.data?.errors?.emailMissing || res.data?.emailMissing);
      throw err;
    }

    return res.data;
  },

  /**
   * Change student account password (with 6-digit Email OTP)
   */
  async changePassword(
    oldPassword: string,
    newPassword: string,
    otp: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch("/student/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        oldPassword,
        newPassword,
        currentPassword: oldPassword,
        cur_pass: oldPassword,
        new_pass: newPassword,
        otp: otp.trim(),
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
