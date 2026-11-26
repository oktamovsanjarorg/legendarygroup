import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  GradingConfig,
  GroupLeaderboardResponse,
  StudentProgressResponse,
  StudentRankingItem,
} from '@lg/contracts';
import { calculateLeaderboardRankings } from '@lg/domain';
import { students } from '@lg/db';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Database } from '@lg/db';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';
import { StudentScopeService } from '../students/index.js';
import { ProgressRepository } from './progress.repository.js';

/** O'quvchining reytingdagi o'rni va ko'rsatkichlari (reytingda yo'q bo'lsa — nol). */
function rankFields(mine: StudentRankingItem | undefined, total: number) {
  return {
    rank: mine?.rank ?? null,
    totalStudents: total > 0 ? total : null,
    averageGrade: mine?.averageGrade ?? 0,
    attendanceRatePercent: mine?.attendanceRatePercent ?? 0,
    averageTestScorePercent: mine?.averageTestScorePercent ?? 0,
    compositeScore: mine?.compositeScore ?? 0,
  };
}

@Injectable()
export class ProgressService {
  constructor(
    @Inject(ProgressRepository) private readonly repo: ProgressRepository,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  /** Guruh reytingi (FR-GRD-5) */
  async getGroupLeaderboard(user: RequestUser, groupId: string): Promise<GroupLeaderboardResponse> {
    const group = await this.repo.findGroupById(groupId);
    if (!group) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    await this.assertCanViewGroup(user, groupId);

    const rankedStudents = await this.computeLeaderboard(groupId, group.gradingConfig.scale);

    return {
      groupId: group.id,
      groupName: group.name,
      students: rankedStudents,
    };
  }

  /** O'quvchi progressi va grafiklari (FR-GRD-5) */
  async getStudentProgress(
    user: RequestUser,
    studentId: string,
    customGroupId?: string,
  ): Promise<StudentProgressResponse> {
    await this.studentScope.assertVisible(user, studentId);

    const [student] = await this.db
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(eq(students.id, studentId));
    if (!student) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const groupInfo = customGroupId
      ? await this.repo.findGroupById(customGroupId)
      : await this.repo.findStudentPrimaryGroup(studentId);

    if (!groupInfo) {
      return this.emptyProgressResponse(student.id, student.fullName);
    }

    const groupId = 'id' in groupInfo ? groupInfo.id : groupInfo.groupId;
    const groupName = 'name' in groupInfo ? groupInfo.name : groupInfo.groupName;

    const config = await this.repo.findGroupById(groupId);
    const leaderboard = await this.computeLeaderboard(
      groupId,
      config?.gradingConfig.scale ?? '0_5',
    );
    const myRankItem = leaderboard.find((s) => s.studentId === studentId);

    const [attendanceTrend, gradesTrend, testResults] = await Promise.all([
      this.repo.getStudentAttendanceTrend(studentId, groupId),
      this.repo.getStudentGradesTrend(studentId, groupId),
      this.repo.getStudentTestResults(studentId, groupId),
    ]);

    return {
      studentId: student.id,
      studentName: student.fullName,
      groupId,
      groupName,
      ...rankFields(myRankItem, leaderboard.length),
      attendanceTrend,
      gradesTrend,
      testResults,
    };
  }

  /** FR-GRD-5: baho guruh shkalasida (0–5 yoki 0–100) — ballga 0..100 qilib qo'shiladi. */
  private async computeLeaderboard(
    groupId: string,
    scale: GradingConfig['scale'],
  ): Promise<StudentRankingItem[]> {
    const groupStudents = await this.repo.findGroupStudents(groupId);
    if (groupStudents.length === 0) return [];

    const [attStats, gradesStats, testStats] = await Promise.all([
      this.repo.getGroupAttendanceStats(groupId),
      this.repo.getGroupGradesStats(groupId),
      this.repo.getGroupTestStats(groupId),
    ]);

    const rawItems = groupStudents.map((s) => {
      const att = attStats.get(s.studentId);
      const totalLessons = att ? att.totalLessons : 0;
      const attendedLessons = att ? att.attendedLessons : 0;
      const attendanceRatePercent =
        totalLessons > 0 ? Math.round((attendedLessons * 1000) / totalLessons) / 10 : 100;

      const averageGrade = gradesStats.get(s.studentId) ?? 0;
      const averageTestScorePercent = testStats.get(s.studentId) ?? 0;

      return {
        studentId: s.studentId,
        studentName: s.studentName,
        studentCode: s.studentCode,
        averageGrade,
        averageTestScorePercent,
        attendanceRatePercent,
        totalLessons,
        attendedLessons,
      };
    });

    return calculateLeaderboardRankings(rawItems, {
      gradeMax: scale === '0_5' ? 5 : 100,
      hasGrades: gradesStats.size > 0,
      hasTests: testStats.size > 0,
    });
  }

  private async assertCanViewGroup(user: RequestUser, groupId: string): Promise<void> {
    if (user.role === 'admin' || user.role === 'director') return;
    if (user.role === 'teacher') {
      await this.groupScope.assertVisible(user, groupId);
      return;
    }
    // Reytingda boshqa oʻquvchilarning ismi va ballari bor — ota-ona va oʻquvchi faqat oʻz
    // oʻrnini progress orqali koʻradi (T-126 D4).
    throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  private emptyProgressResponse(studentId: string, studentName: string): StudentProgressResponse {
    return {
      studentId,
      studentName,
      groupId: '00000000-0000-0000-0000-000000000000',
      groupName: '—',
      rank: null,
      totalStudents: null,
      averageGrade: 0,
      attendanceRatePercent: 0,
      averageTestScorePercent: 0,
      compositeScore: 0,
      attendanceTrend: [],
      gradesTrend: [],
      testResults: [],
    };
  }
}
