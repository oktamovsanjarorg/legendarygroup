import type { StudentRankingItem } from '@lg/contracts';

export interface ScoreInputs {
  /** Baho 0..100 ga keltirilgan; `null` — guruhda hali baho yo'q (komponent tashlanadi). */
  averageGradePercent: number | null;
  /** `null` — guruhda hali test yo'q. */
  averageTestScorePercent: number | null;
  attendanceRatePercent: number;
}

const WEIGHTS = { grade: 45, test: 35, attendance: 20 } as const;

/**
 * FR-GRD-5 O'quvchining kompozit reyting balini hisoblaydi (0..100): 45% baho, 35% test,
 * 20% davomat. Guruhda ma'lumoti yo'q komponent tashlanadi va qolganlari ulushiga qarab
 * qayta taqsimlanadi (aks holda testsiz guruhda hamma balli 35% ga past chiqardi).
 */
export function calculateStudentCompositeScore(input: ScoreInputs): number {
  const parts: [number, number][] = [[input.attendanceRatePercent, WEIGHTS.attendance]];
  if (input.averageGradePercent !== null) parts.push([input.averageGradePercent, WEIGHTS.grade]);
  if (input.averageTestScorePercent !== null)
    parts.push([input.averageTestScorePercent, WEIGHTS.test]);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  const raw = parts.reduce((s, [v, w]) => s + v * w, 0) / weight;
  const rounded = Math.round(raw * 10) / 10;
  return Math.min(100, Math.max(0, rounded));
}

/** Guruh baho shkalasi (0–5 → 5, 0–100 → 100) va qaysi ma'lumot borligi. */
export interface LeaderboardOptions {
  gradeMax: number;
  /** Guruhda kamida bitta baho bor (sukut — ha). */
  hasGrades?: boolean;
  /** Guruhda kamida bitta test natijasi bor (sukut — ha). */
  hasTests?: boolean;
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
 * `averageGrade` — guruh shkalasida (ko'rsatish uchun), ballda — 0..100 ga keltiriladi.
 */
export function calculateLeaderboardRankings(
  items: RawStudentRankingItem[],
  opts: LeaderboardOptions,
): StudentRankingItem[] {
  const withScores = items.map((item) => {
    const compositeScore = calculateStudentCompositeScore({
      averageGradePercent:
        opts.hasGrades === false ? null : (item.averageGrade * 100) / opts.gradeMax,
      averageTestScorePercent: opts.hasTests === false ? null : item.averageTestScorePercent,
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
