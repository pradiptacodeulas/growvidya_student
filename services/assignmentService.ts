import { apiFetch } from "./apiClient";

export interface AssignmentItem {
  id: number | string;
  school_id: number;
  title: string;
  assignment_type_id: number;
  assignment_type: string;
  type_name?: string;
  class_id: number;
  class_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  assigned_date: string;
  due_date: string;
  assignment_status: number;
  is_published: number;
  created_on: string;
  total_questions: number;
  attempt_id?: number | null;
  correct_answers?: number | null;
  score_percentage?: string | number | null;
  attempted_at?: string | null;
  status: "Pending" | "Attempted" | "Expired";
  is_expired?: boolean;
}

export interface QuestionOption {
  id: number | string;
  answer: string;
  is_correct?: number;
}

export interface AssignmentAttemptInfo {
  id: number | string;
  assignment_id: number | string;
  student_id: number | string;
  total_questions: number;
  correct_answers: number;
  score_percentage: string | number;
  attempted_at: string;
  status?: number;
}

export interface AssignmentAttemptQuestion {
  id: number | string;
  question: string;
  options: QuestionOption[];
  studentSubmission?: {
    selected_answer_id: number | string | null;
    is_correct: number;
  } | null;
}

export interface AssignmentAttemptDetails {
  assignment: AssignmentItem;
  alreadyAttempted: boolean;
  questions: AssignmentAttemptQuestion[];
  attempt?: AssignmentAttemptInfo | null;
}

export interface SubmitAttemptResult {
  attemptId: number;
  totalQuestions: number;
  correctAnswersCount: number;
  scorePercentage: string | number;
}

export const assignmentService = {
  /**
   * Get all assignments published for the student's class and section
   */
  async getAssignments(_token?: string): Promise<{ success: boolean; data: AssignmentItem[]; message?: string }> {
    const res = await apiFetch("/student/assignments", { method: "GET" });
    if (!res.success || !res.data) {
      return { success: false, data: [], message: res.message };
    }

    const items: AssignmentItem[] = (Array.isArray(res.data) ? res.data : []).map((item) => {
      const isExpired = item.status === "Expired" || (item.due_date && new Date(item.due_date) < new Date());
      return {
        ...item,
        type_name: item.assignment_type || "Homework",
        is_expired: isExpired,
      };
    });

    return {
      success: true,
      data: items,
      message: res.message,
    };
  },

  /**
   * Get assignment questions and options for student attempt
   */
  async getAssignmentForAttempt(assignmentId: number | string): Promise<{
    success: boolean;
    data?: AssignmentAttemptDetails;
    error?: string;
  }> {
    const res = await apiFetch(`/student/assignments/${assignmentId}/attempt`, { method: "GET" });
    if (!res.success || !res.data) {
      return { success: false, error: res.message || "Failed to load assignment questions." };
    }
    return { success: true, data: res.data };
  },

  /**
   * Submit student answers for assignment attempt
   */
  async submitAssignment(
    assignmentId: number | string,
    answers: Record<string | number, string | number>
  ): Promise<{ success: boolean; data?: SubmitAttemptResult; error?: string }> {
    const res = await apiFetch(`/student/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.message || "Failed to submit assignment." };
    }

    return { success: true, data: res.data };
  },

  /**
   * Get result and feedback breakdown of an attempted assignment
   */
  async getAssignmentResult(assignmentId: number | string): Promise<{
    success: boolean;
    data?: AssignmentAttemptDetails;
    error?: string;
  }> {
    const res = await apiFetch(`/student/assignments/${assignmentId}/result`, { method: "GET" });
    if (!res.success || !res.data) {
      return { success: false, error: res.message || "Failed to fetch assignment result." };
    }
    return { success: true, data: res.data };
  },
};

export default assignmentService;
