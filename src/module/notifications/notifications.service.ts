import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  Role,
  TeacherReviewStatus,
  TestStatus,
} from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

export type NotificationType =
  | 'TEST_RESULT'
  | 'PENDING_REVIEW'
  | 'PENDING_MODERATION';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

export type NotificationsResponse = {
  unreadCount: number;
  items: NotificationItem[];
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async getForUser(userId: string, role: Role): Promise<NotificationsResponse> {
    try {
      if (role === Role.GIAOVIEN || role === Role.ADMIN) {
        return this.getForTeacherOrAdmin(userId, role);
      }
      return this.getForStudent(userId);
    } catch (error) {
      this.handleError(error, 'load notifications');
    }
  }

  private async getForStudent(userId: string): Promise<NotificationsResponse> {
    const since = new Date(Date.now() - SEVEN_DAYS_MS);
    const results = await this.prisma.userTestResult.findMany({
      where: {
        idUser: userId,
        status: TestStatus.FINISHED,
        finishedAt: { gte: since },
      },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      select: {
        idTestResult: true,
        bandScore: true,
        finishedAt: true,
        test: {
          select: {
            title: true,
            testType: true,
          },
        },
      },
    });

    const items: NotificationItem[] = results.map((r) => ({
      id: `result-${r.idTestResult}`,
      type: 'TEST_RESULT',
      title: `Bài ${r.test?.testType ?? ''} đã được chấm`,
      message: `${r.test?.title ?? 'Bài thi'} — Band ${r.bandScore?.toFixed?.(1) ?? r.bandScore ?? '-'}`,
      href: '/teacher-review-history',
      createdAt: (r.finishedAt ?? new Date()).toISOString(),
    }));

    return { unreadCount: items.length, items };
  }

  private async getForTeacherOrAdmin(
    userId: string,
    role: Role,
  ): Promise<NotificationsResponse> {
    const tickets = await this.prisma.teacherReviewTicket.findMany({
      where: { status: TeacherReviewStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        testResult: {
          include: {
            test: { select: { title: true, testType: true } },
            user: { select: { nameUser: true } },
          },
        },
      },
    });

    const items: NotificationItem[] = tickets.map((t) => {
      const type = t.testResult?.test?.testType ?? 'WRITING';
      const student = t.testResult?.user?.nameUser ?? 'Học viên';
      const testName = t.testResult?.test?.title ?? `Bài ${type}`;
      const href =
        role === Role.ADMIN
          ? '/admin/teacher-review'
          : '/teacher/teacher-review';
      return {
        id: `ticket-${t.idTicket}`,
        type: 'PENDING_REVIEW',
        title: `Yêu cầu chấm ${type} mới`,
        message: `${student} — ${testName}`,
        href,
        createdAt: (t.createdAt ?? new Date()).toISOString(),
      };
    });

    return { unreadCount: items.length, items };
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(`Failed to ${operation}`, error as any);
    throw new InternalServerErrorException(
      `An error occurred while trying to ${operation}`,
    );
  }
}
