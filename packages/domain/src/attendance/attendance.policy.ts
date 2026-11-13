import type { AttendanceStatus, RoleCode } from '@lg/contracts';

export interface CanEditAttendanceParams {
  lessonDate: string; // YYYY-MM-DD
  userRole: RoleCode;
  hasEditPastPermission: boolean;
  now: Date;
}

export interface CanEditAttendanceResult {
  allowed: boolean;
  requiresReason: boolean;
  reason?: string;
}

/**
 * BR-30 Davomatni oʻzgartirish qoidasi:
 * - Ustoz: faqat dars kuni 23:59:59 gacha.
 * - Admin/Director (attendance.edit_past): dars kunidan keyin ham, lekin sabab (changeReason) bilan.
 */
export function canEditAttendance(params: CanEditAttendanceParams): CanEditAttendanceResult {
  const { lessonDate, hasEditPastPermission, now } = params;

  // Toshkent vaqti yoki lokal sanani YYYY-MM-DD olish
  const today = now.toISOString().slice(0, 10);

  // Agar dars bugun yoki kelajakda bo'lsa (bugun 23:59 gacha)
  if (lessonDate >= today) {
    return { allowed: true, requiresReason: false };
  }

  // O'tgan kunlar:
  if (hasEditPastPermission) {
    return { allowed: true, requiresReason: true };
  }

  return {
    allowed: false,
    requiresReason: false,
    reason: 'ATTENDANCE_LOCKED_PAST',
  };
}

/**
 * BR-31, BR-10 "Kelmadi / kech qoldi" xabari qoidasi:
 * - Kelmadi (absent) -> xabar yuboriladi
 * - Kech qoldi (late) -> faqat kechikish >= 15 daqiqa bo'lsa xabar yuboriladi
 */
export function shouldNotifyAbsenceOrLate(item: {
  status: AttendanceStatus;
  lateMinutes?: number | null;
}): boolean {
  if (item.status === 'absent') return true;
  if (item.status === 'late' && (item.lateMinutes ?? 0) >= 15) return true;
  return false;
}
