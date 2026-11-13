export interface StudentCandidate {
  id: string;
  code: number;
  fullName: string;
}

export type StudentMatchResult =
  | { type: 'code'; student: StudentCandidate }
  | { type: 'exact_name'; student: StudentCandidate }
  | { type: 'suggested'; student: StudentCandidate; similarity: number }
  | { type: 'unmatched'; reason: string };

/**
 * BR-34: Test bali tekshiruvi.
 * Ball 0 dan max_score oralig'ida bo'lishi shart.
 */
export function validateTestScore(score: number, maxScore: number): boolean {
  if (maxScore <= 0) return false;
  return Number.isInteger(score) && score >= 0 && score <= maxScore;
}

/**
 * BR-34: Test bo'limlari bo'yicha ballar tekshiruvi.
 */
export function validateSectionScores(
  sectionScores: Array<{ sectionName: string; score: number }>,
  sections: Array<{ name: string; maxScore: number }>,
): { valid: boolean; error?: string } {
  const sectionMap = new Map<string, number>();
  for (const sec of sections) {
    sectionMap.set(sec.name, sec.maxScore);
  }

  for (const s of sectionScores) {
    const maxSecScore = sectionMap.get(s.sectionName);
    if (maxSecScore === undefined) {
      return { valid: false, error: `SECTION_NOT_FOUND: ${s.sectionName}` };
    }
    if (!Number.isInteger(s.score) || s.score < 0 || s.score > maxSecScore) {
      return { valid: false, error: `SECTION_SCORE_OUT_OF_BOUNDS: ${s.sectionName}` };
    }
  }

  return { valid: true };
}

/**
 * BR-34: Foiz hisoblash (0..100).
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0 || score <= 0) return 0;
  const pct = (score / maxScore) * 100;
  return Math.round(pct * 100) / 100;
}

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`ʼʻʻ']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateBigramSimilarity(str1: string, str2: string): number {
  const s1 = cleanText(str1);
  const s2 = cleanText(str2);
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      map.set(bigram, (map.get(bigram) ?? 0) + 1);
    }
    return map;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;

  for (const [bigram, count1] of b1.entries()) {
    const count2 = b2.get(bigram) ?? 0;
    intersection += Math.min(count1, count2);
  }

  const total = s1.length - 1 + (s2.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * BR-35: Excel importida o'quvchini moslashtirish zanjiri.
 * 1) code bo'yicha aniq moslik
 * 2) F.I.Sh to'liq aniq mosligi
 * 3) Fuzzy similarity >= 0.65 bo'lsa taklif, aks holda topilmadi
 */
export function matchStudent(
  rawIdentifier: string,
  students: StudentCandidate[],
): StudentMatchResult {
  const trimmed = rawIdentifier.trim();
  if (!trimmed) {
    return { type: 'unmatched', reason: 'EMPTY_IDENTIFIER' };
  }

  // 1) Raqam (o'quvchi kodi)
  const numericCode = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(numericCode) && String(numericCode) === trimmed) {
    const byCode = students.find((s) => s.code === numericCode);
    if (byCode) {
      return { type: 'code', student: byCode };
    }
  }

  // 2) Aniq ism
  const cleanedRaw = cleanText(trimmed);
  const exact = students.find((s) => cleanText(s.fullName) === cleanedRaw);
  if (exact) {
    return { type: 'exact_name', student: exact };
  }

  // 3) Fuzzy similarity
  let bestMatch: StudentCandidate | null = null;
  let highestSimilarity = 0;

  for (const st of students) {
    const sim = calculateBigramSimilarity(cleanedRaw, st.fullName);
    if (sim > highestSimilarity) {
      highestSimilarity = sim;
      bestMatch = st;
    }
  }

  if (bestMatch && highestSimilarity >= 0.65) {
    return {
      type: 'suggested',
      student: bestMatch,
      similarity: Math.round(highestSimilarity * 100) / 100,
    };
  }

  return { type: 'unmatched', reason: 'STUDENT_NOT_FOUND' };
}
