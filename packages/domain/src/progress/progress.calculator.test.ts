import { describe, expect, it } from 'vitest';
import {
  calculateLeaderboardRankings,
  calculateStudentCompositeScore,
} from './progress.calculator.js';

describe('T-303 FR-GRD-5 Progress va reyting kalkulyatori', () => {
  it('kompozit ballni toʻgʻri hisoblaydi (45% baho, 35% test, 20% davomat)', () => {
    const score = calculateStudentCompositeScore({
      averageGrade: 90,
      averageTestScorePercent: 80,
      attendanceRatePercent: 100,
    });
    // 90 * 0.45 = 40.5; 80 * 0.35 = 28; 100 * 0.20 = 20 => 40.5 + 28 + 20 = 88.5
    expect(score).toBe(88.5);
  });

  it('guruh oʻquvchilarini toʻgʻri saralab rank oʻrinlarini beradi', () => {
    const raw = [
      {
        studentId: 's1',
        studentName: 'Ali',
        studentCode: 'LG-1001',
        averageGrade: 70,
        averageTestScorePercent: 60,
        attendanceRatePercent: 80,
        totalLessons: 10,
        attendedLessons: 8,
      },
      {
        studentId: 's2',
        studentName: 'Vali',
        studentCode: 'LG-1002',
        averageGrade: 95,
        averageTestScorePercent: 90,
        attendanceRatePercent: 100,
        totalLessons: 10,
        attendedLessons: 10,
      },
      {
        studentId: 's3',
        studentName: 'Gani',
        studentCode: 'LG-1003',
        averageGrade: 85,
        averageTestScorePercent: 85,
        attendanceRatePercent: 90,
        totalLessons: 10,
        attendedLessons: 9,
      },
    ];

    const ranked = calculateLeaderboardRankings(raw);
    expect(ranked.length).toBe(3);
    expect(ranked[0]?.studentName).toBe('Vali');
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.studentName).toBe('Gani');
    expect(ranked[1]?.rank).toBe(2);
    expect(ranked[2]?.studentName).toBe('Ali');
    expect(ranked[2]?.rank).toBe(3);
  });
});
