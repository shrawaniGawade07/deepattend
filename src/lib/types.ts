export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  semester: string;
  guardianEmail: string;
  phone: string;
  faceTemplate?: number[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;        // YYYY-MM-DD
  status: 'present' | 'absent';
  method: 'face' | 'manual';
  confidence: number;
  timestamp: number;
}

export interface AttendanceStats {
  totalClasses: number;
  presentClasses: number;
  percentage: number;
}
