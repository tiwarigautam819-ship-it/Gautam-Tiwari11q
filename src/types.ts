export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  enrollmentNumber: string;
  class: string; // 'B.Tech'
  branch: string; // 'Computer Science & Engineering'
  semester: string; // '1st Semester'
  section: string; // 'A'
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent';

export interface AttendanceRecord {
  id: string; // formatted as `${date}_${studentId}` to guarantee uniqueness
  date: string; // 'YYYY-MM-DD'
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
}

export interface DayAttendanceSummary {
  date: string;
  displayDate: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface WeeklyReportRow {
  student: Student;
  dayStatuses: Record<string, AttendanceStatus | 'Unmarked'>;
  totalPresent: number;
  totalDays: number;
  percentage: number;
}

export type ScreenType =
  | 'dashboard'
  | 'mark-attendance'
  | 'students'
  | 'history'
  | 'weekly-report'
  | 'settings';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
