import type { ChurnRiskFactor } from '@lg/contracts';

export interface ChurnInputParams {
  attendanceDropPercent: number; // 0..100
  paymentDelayDays: number; // 0..n
  gradeDropPercent: number; // 0..100
  botUnresponsive: boolean;
}

export interface ChurnCalculationResult {
  score: number;
  isAtRisk: boolean;
  factors: ChurnRiskFactor[];
}

/**
 * BR-36: Ketish xavfi (churn risk) balli 0–100 va komponentlarini hisoblaydi.
 * - oxirgi 4 hafta davomat % pasayishi (40%)
 * - to'lov kechikishi kunlari (30%)
 * - baho tendensiyasi pasayishi (20%)
 * - ota-ona botni bloklagan / javob bermaydi (10%)
 * - ball >= 60 bo'lsa — "xavfli"
 */
export function calculateChurnScore(params: ChurnInputParams): ChurnCalculationResult {
  const attScore = Math.round(Math.min(40, Math.max(0, (params.attendanceDropPercent / 100) * 40)));
  const payScore = Math.round(Math.min(30, Math.max(0, (params.paymentDelayDays / 30) * 30)));
  const gradeScore = Math.round(Math.min(20, Math.max(0, (params.gradeDropPercent / 100) * 20)));
  const botScore = params.botUnresponsive ? 10 : 0;

  const totalScore = Math.min(100, Math.max(0, attScore + payScore + gradeScore + botScore));

  const factors: ChurnRiskFactor[] = [
    {
      factor: 'attendance_drop',
      score: attScore,
      weight: 40,
      reason: `Oxirgi 4 haftada davomat ${params.attendanceDropPercent}% ga pasaygan`,
    },
    {
      factor: 'payment_delay',
      score: payScore,
      weight: 30,
      reason: `Toʻlov ${params.paymentDelayDays} kunga kechikkan`,
    },
    {
      factor: 'grade_drop',
      score: gradeScore,
      weight: 20,
      reason: `Oʻzlashtirish bahosi ${params.gradeDropPercent}% ga pasaygan`,
    },
    {
      factor: 'bot_unresponsive',
      score: botScore,
      weight: 10,
      reason: params.botUnresponsive
        ? 'Ota-ona botni bloklagan yoki javob bermaydi'
        : 'Bot faol ulangan',
    },
  ];

  return {
    score: totalScore,
    isAtRisk: totalScore >= 60,
    factors,
  };
}

/**
 * FR-DASH-3: 1–3 oylik tushum prognozi va ishonch oralig'ini hisoblaydi.
 */
export function calculateRevenueForecast(params: {
  activeValue: bigint;
  historicalCollectionRateBp: number;
  monthDistance: number; // 1, 2 yoki 3
}): { expected: bigint; lowerBound: bigint; upperBound: bigint } {
  const expected = (params.activeValue * BigInt(params.historicalCollectionRateBp)) / 10000n;
  const marginBp = BigInt(Math.min(3000, 500 * Math.max(1, params.monthDistance)));
  const margin = (expected * marginBp) / 10000n;

  return {
    expected,
    lowerBound: expected >= margin ? expected - margin : 0n,
    upperBound: expected + margin,
  };
}

/**
 * Guruh to'lish darajasini hisoblaydi (0..10000 bp).
 */
export function calculateGroupOccupancy(
  capacity: number,
  currentActive: number,
  projectedChurn: number,
): { occupancyRateBp: number; projectedOccupancyRateBp: number } {
  if (capacity <= 0) return { occupancyRateBp: 0, projectedOccupancyRateBp: 0 };
  const occ = Math.round((currentActive / capacity) * 10000);
  const projActive = Math.max(0, currentActive - projectedChurn);
  const projOcc = Math.round((projActive / capacity) * 10000);
  return {
    occupancyRateBp: Math.min(10000, occ),
    projectedOccupancyRateBp: Math.min(10000, projOcc),
  };
}
