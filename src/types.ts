export type GameState =
  | 'READY'
  | 'MOVE'
  | 'FREEZE'
  | 'SCANNING'
  | 'RANDOM_PICK'
  | 'WINNER'
  | 'QUESTION'
  | 'RESULT'
  | 'END_GAME';

export interface Team {
  id: string;
  name: string;
  color: string; // Hex color code
  bgGradient: string;
  textColor: string;
  borderColor: string;
  icon: string; // Emoji
  score: number;
}

export interface PlayerSlot {
  slotId: 1 | 2 | 3;
  teamId: string;
  label: string; // "PLAYER 1", "PLAYER 2", "PLAYER 3"
  active: boolean; // Is this slot enabled in current game
  present: boolean; // Detected by camera or active in demo
  motionLevel: number; // 0 to 100
  lastPicked?: boolean;
  freezeScore?: number; // 0 to 100 (Stillness Score)
  freezeAvgMotion?: number; // Average motion level observed (0 to 100)
  freezeReactionTimeSec?: number; // Time in seconds to achieve stillness
  freezeRank?: number; // 1 (Best freeze), 2, 3
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';

export type QuestionSetVisibility = 'private' | 'shared' | 'public';

export interface TeacherUser {
  uid: string;
  email: string;
  name: string;
  school?: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  questionSetId?: string;
  ownerId?: string;
  subject: string;
  gradeLevel?: string;
  type: QuestionType;
  question: string;
  options?: string[]; // 4 options for multiple choice
  correctAnswer: string | number; // index (0-3) or string
  explanation?: string;
  imageUrl?: string;
  points: number;
  order?: number;
  used?: boolean;
}

export interface QuestionSet {
  id: string;
  name: string;
  title?: string; // alias for name
  description?: string;
  subject?: string;
  grade?: string;
  questionCount?: number;
  visibility?: QuestionSetVisibility;
  shareCode?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt?: string;
  questions: Question[];
  isDefault?: boolean;
}

export type MusicTrackId = 'funk' | 'disco' | 'arcade' | 'drums' | 'edm' | 'custom';

export interface GameSettings {
  moveDurationSec: number;
  scanDurationSec: number;
  pickDurationSec: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicTrack: MusicTrackId;
  musicVolume: number; // 0 to 100
  customMusicName?: string;
  customMusicUrl?: string;
  isDemoMode: boolean;
  schoolName: string;
  classroomName: string;
  teacherName: string;
  randomQuestionOrder: boolean;
  cameraFacingMode: 'user' | 'environment';
  motionSensitivity: number; // 1 to 10
}

export interface RoundHistory {
  round: number;
  winningSlot: 1 | 2 | 3;
  winningTeamId: string;
  winningTeamName: string;
  question: Question;
  isCorrect: boolean;
  pointsAwarded: number;
  timestamp: number;
}

export interface CertificateData {
  recipientName: string;
  teamName: string;
  achievementTitle: string;
  reason: string;
  schoolName: string;
  classroomName: string;
  teacherName: string;
  date: string;
  score: number;
}
