import type { StudentRankingItem } from '@lg/contracts';

export interface ScoreInputs {
  averageGrade: number;
  averageTestScorePercent: number;
  attendanceRatePercent: number;
}

/**
 * FR-GRD-5 O'quvchining kompozit reyting balini hisoblaydi (0..100).
 * - 45% Baholar (uyga vazifa, darsdagi faollik)
 * - 35% Test natijalari (nazorat ishlari, oraliq testlar)
 * - 20% Davomat ko'rsatkichi
 */
export function calculateStudentCompositeScore(input: ScoreInputs): number {
  const gradeWeight = 0.45;
  const testWeight = 0.35;
  const attWeight = 0.2;

  const raw =
    input.averageGrade * gradeWeight +
    input.averageTestScorePercent * testWeight +
    input.attendanceRatePercent * attWeight;

  const rounded = Math.round(raw * 10) / 10;
  return Math.min(100, Math.max(0, rounded));
}

export interface RawStudentRankingItem {
  studentId: string;
  studentName: string;
  studentCode: string;
  averageGrade: number;
  averageTestScorePercent: number;
  attendanceRatePercent: number;
  totalLessons: number;
  attendedLessons: number;
}

/**
 * Guruh o'quvchilarini kompozit ball bo'yicha saralab reyting (rank) o'rinlarini belgilaydi.
 */
export function calculateLeaderboardRankings(items: RawStudentRankingItem[]): StudentRankingItem[] {
  const withScores = items.map((item) => {
    const compositeScore = calculateStudentCompositeScore({
      averageGrade: item.averageGrade,
      averageTestScorePercent: item.averageTestScorePercent,
      attendanceRatePercent: item.attendanceRatePercent,
    });
    return { ...item, compositeScore };
  });

  // Kompozit ball bo'yicha kamayish tartibida saralash
  withScores.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    if (b.averageGrade !== a.averageGrade) {
      return b.averageGrade - a.averageGrade;
    }
    return b.attendanceRatePercent - a.attendanceRatePercent;
  });

  return withScores.map((item, idx) => ({
    studentId: item.studentId,
    studentName: item.studentName,
    studentCode: item.studentCode,
    rank: idx + 1,
    attendanceRatePercent: item.attendanceRatePercent,
    averageGrade: item.averageGrade,
    averageTestScorePercent: item.averageTestScorePercent,
    compositeScore: item.compositeScore,
    totalLessons: item.totalLessons,
    attendedLessons: item.attendedLessons,
  }));
}
