import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { Role, TestType, TeacherReviewStatus, ReviewType, AssignMode } from '@prisma/client';
import { SubmitScoreDto } from './dto/submit-score.dto';

@Injectable()
export class TeacherReviewService {
  private readonly logger = new Logger(TeacherReviewService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  private async assertTeacherOrAdmin(idUser: string): Promise<void> {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
      select: { role: true },
    });

    if (!user || (user.role !== Role.GIAOVIEN && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Only teachers can access review tickets');
    }
  }

  /**
   * User requests a teacher review for their completed Writing/Speaking test
   */
  async requestReview(idTestResult: string, idUser: string) {
    // 1. Validate test result exists and belongs to user
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      include: {
        test: true,
        writingSubmissions: {
          where: { idUser },
        },
        speakingSubmissions: {
          where: { idUser },
        },
      },
    });

    if (!testResult) {
      throw new NotFoundException('Test result not found');
    }

    if (testResult.idUser !== idUser) {
      throw new ForbiddenException(
        'You do not have permission to request review for this test',
      );
    }

    if (
      testResult.test.testType !== TestType.WRITING &&
      testResult.test.testType !== TestType.SPEAKING
    ) {
      throw new BadRequestException(
        'Teacher review is only available for Writing and Speaking tests',
      );
    }

    // 2. Check if there's already a pending/claimed ticket for this test result
    const existingTicket = await this.checkExistingTicketForStudent(
      idTestResult,
      idUser,
    );

    if (existingTicket) {
      throw new BadRequestException({
        message: 'ALREADY_REQUESTED',
        detail: 'A teacher review request already exists for this test',
      });
    }

    // 3. Get AI grading info from submissions
    let aiBandScore: number | undefined = undefined;
    let aiFeedback: Record<string, any> | undefined = undefined;

    if (
      testResult.test.testType === TestType.WRITING &&
      testResult.writingSubmissions.length > 0
    ) {
      const submission = testResult.writingSubmissions[0];
      aiBandScore = submission.aiOverallScore ?? undefined;
      aiFeedback =
        (submission.aiDetailedFeedback as Record<string, any>) ?? undefined;
    } else if (
      testResult.test.testType === TestType.SPEAKING &&
      testResult.speakingSubmissions.length > 0
    ) {
      const submission = testResult.speakingSubmissions[0];
      aiBandScore = submission.aiOverallScore ?? undefined;
      aiFeedback =
        (submission.aiDetailedFeedback as Record<string, any>) ?? undefined;
    }

    // 4. Determine assignment based on assign mode (AUTO or MANUAL)
    const { teacherId, status } = await this.determineAssignment();

    // 5. Create the ticket
    const ticket = await this.databaseService.teacherReviewTicket.create({
      data: {
        idTestResult,
        idUser,
        type: testResult.test.testType as ReviewType,
        status,
        idTeacher: teacherId,
        claimedAt: teacherId ? new Date() : null,
        aiBandScore,
        aiFeedback,
      },
      include: {
        testResult: {
          include: {
            test: true,
          },
        },
        teacher: {
          select: {
            idUser: true,
            nameUser: true,
          },
        },
      },
    });

    return {
      message: teacherId
        ? 'Teacher review requested and auto-assigned successfully'
        : 'Teacher review requested successfully. Waiting for teacher to claim.',
      data: ticket,
      status: 201,
    };
  }

  /**
   * Get all pending tickets (for teacher queue)
   */
  async getPendingTickets(filters?: {
    type?: ReviewType;
    status?: TeacherReviewStatus;
  }, requesterId?: string) {
    if (requesterId) {
      await this.assertTeacherOrAdmin(requesterId);
    }

    const whereClause: any = {};

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    } else {
      whereClause.status = TeacherReviewStatus.PENDING;
    }

    const tickets = await this.databaseService.teacherReviewTicket.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        testResult: {
          include: {
            test: {
              select: {
                idTest: true,
                title: true,
                testType: true,
              },
            },
            user: {
              select: {
                idUser: true,
                nameUser: true,
                avatar: true,
              },
            },
          },
        },
        teacher: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
      },
    });

    // Transform data for frontend
    const transformedTickets = tickets.map((ticket) => ({
      idTicket: ticket.idTicket,
      type: ticket.type,
      status: ticket.status,
      aiBandScore: ticket.aiBandScore,
      createdAt: ticket.createdAt,
      claimedAt: ticket.claimedAt,
      submittedAt: ticket.submittedAt,
      studentName: ticket.testResult.user.nameUser,
      studentAvatar: ticket.testResult.user.avatar,
      testTitle: ticket.testResult.test.title,
      testType: ticket.testResult.test.testType,
      teacherId: ticket.teacher?.idUser,
      teacherName: ticket.teacher?.nameUser,
      commissionAmount: ticket.commissionAmount,
    }));

    return {
      message: 'Pending tickets retrieved successfully',
      data: transformedTickets,
      status: 200,
    };
  }

  /**
   * Get teacher's assigned tickets
   */
  async getTeacherQueue(idTeacher: string, page = 1, limit = 20) {
    await this.assertTeacherOrAdmin(idTeacher);

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.databaseService.teacherReviewTicket.findMany({
        where: {
          idTeacher,
          status: {
            in: [TeacherReviewStatus.CLAIMED, TeacherReviewStatus.IN_PROGRESS],
          },
        },
        orderBy: { claimedAt: 'desc' },
        skip,
        take: limit,
        include: {
          testResult: {
            include: {
              test: {
                select: {
                  idTest: true,
                  title: true,
                  testType: true,
                },
              },
              user: {
                select: {
                  idUser: true,
                  nameUser: true,
                  avatar: true,
                },
              },
              writingSubmissions: true,
              speakingSubmissions: true,
            },
          },
        },
      }),
      this.databaseService.teacherReviewTicket.count({
        where: {
          idTeacher,
          status: {
            in: [TeacherReviewStatus.CLAIMED, TeacherReviewStatus.IN_PROGRESS],
          },
        },
      }),
    ]);

    return {
      message: 'Teacher queue retrieved successfully',
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      status: 200,
    };
  }

  /**
   * Teacher claims a ticket
   */
  async claimTicket(idTeacher: string, idTicket: string) {
    await this.assertTeacherOrAdmin(idTeacher);

    // Atomic claim to avoid double-claim race conditions.
    const claimResult = await this.databaseService.teacherReviewTicket.updateMany(
      {
        where: {
          idTicket,
          status: TeacherReviewStatus.PENDING,
          idTeacher: null,
        },
        data: {
          idTeacher,
          status: TeacherReviewStatus.CLAIMED,
          claimedAt: new Date(),
        },
      },
    );

    if (claimResult.count === 0) {
      const existingTicket =
        await this.databaseService.teacherReviewTicket.findUnique({
          where: { idTicket },
          select: { idTicket: true },
        });

      if (!existingTicket) {
        throw new NotFoundException('Ticket not found');
      }

      throw new BadRequestException('This ticket is no longer available');
    }

    const updatedTicket = await this.databaseService.teacherReviewTicket.findUnique(
      {
        where: { idTicket },
      },
    );

    return {
      message: 'Ticket claimed successfully',
      data: updatedTicket,
      status: 200,
    };
  }

  /**
   * Teacher unclaims a ticket (releases it back to queue)
   */
  async unclaimTicket(idTeacher: string, idTicket: string) {
    await this.assertTeacherOrAdmin(idTeacher);

    const ticket = await this.databaseService.teacherReviewTicket.findUnique({
      where: { idTicket },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.idTeacher !== idTeacher) {
      throw new ForbiddenException('You did not claim this ticket');
    }

    if (ticket.status === TeacherReviewStatus.COMPLETED) {
      throw new BadRequestException('Cannot unclaim a completed ticket');
    }

    const updatedTicket = await this.databaseService.teacherReviewTicket.update(
      {
        where: { idTicket },
        data: {
          idTeacher: null,
          status: TeacherReviewStatus.PENDING,
          claimedAt: null,
        },
      },
    );

    return {
      message: 'Ticket released successfully',
      data: updatedTicket,
      status: 200,
    };
  }

  /**
   * Teacher submits their score and feedback
   */
  async submitScore(idTeacher: string, idTicket: string, dto: SubmitScoreDto) {
    await this.assertTeacherOrAdmin(idTeacher);

    const ticket = await this.databaseService.teacherReviewTicket.findUnique({
      where: { idTicket },
      include: {
        testResult: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.idTeacher !== idTeacher) {
      throw new ForbiddenException('You did not claim this ticket');
    }

    if (ticket.status === TeacherReviewStatus.COMPLETED) {
      throw new BadRequestException('This ticket has already been scored');
    }

    if (
      ticket.status !== TeacherReviewStatus.CLAIMED &&
      ticket.status !== TeacherReviewStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Ticket must be claimed before submitting score');
    }

    // Get commission from SystemConfig
    const commissionConfig = await this.systemConfigService.getCommission();
    const commission =
      commissionConfig[ticket.type.toLowerCase() as 'writing' | 'speaking'] || 0;

    // Update ticket with teacher score and commission
    const updatedTicket = await this.databaseService.teacherReviewTicket.update(
      {
        where: { idTicket },
        data: {
          status: TeacherReviewStatus.COMPLETED,
          teacherBandScore: dto.bandScore,
          teacherFeedback: dto.feedback,
          submittedAt: new Date(),
          commissionAmount: commission,
        },
      },
    );

    return {
      message: 'Score submitted successfully',
      data: updatedTicket,
      commission,
      status: 200,
    };
  }

  /**
   * Get ticket details
   */
  async getTicketDetail(idTicket: string, requesterId: string) {
    await this.assertTeacherOrAdmin(requesterId);

    const ticket = await this.databaseService.teacherReviewTicket.findUnique({
      where: { idTicket },
      include: {
        testResult: {
          include: {
            test: {
              include: {
                writingTasks: true,
                speakingTasks: {
                  include: {
                    questions: true,
                  },
                },
              },
            },
            user: {
              select: {
                idUser: true,
                nameUser: true,
                avatar: true,
              },
            },
            writingSubmissions: true,
            speakingSubmissions: true,
          },
        },
        teacher: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Transform for frontend - include full submissions array for writing tasks
    const writingSubmissions =
      ticket.type === ReviewType.WRITING
        ? ticket.testResult.writingSubmissions?.map((ws) => ({
            idWritingTask: ws.idWritingTask,
            submissionText: ws.submissionText,
          }))
        : undefined;

    const submissionContent =
      ticket.type === ReviewType.WRITING
        ? ticket.testResult.writingSubmissions?.[0]?.submissionText
        : ticket.testResult.speakingSubmissions?.[0]?.audioUrl;

    return {
      message: 'Ticket detail retrieved successfully',
      data: {
        idTicket: ticket.idTicket,
        type: ticket.type,
        status: ticket.status,
        aiBandScore: ticket.aiBandScore,
        aiFeedback: ticket.aiFeedback,
        teacherBandScore: ticket.teacherBandScore,
        teacherFeedback: ticket.teacherFeedback,
        createdAt: ticket.createdAt,
        claimedAt: ticket.claimedAt,
        submittedAt: ticket.submittedAt,
        student: ticket.testResult.user,
        test: ticket.testResult.test,
        testResult: {
          ...ticket.testResult,
          writingSubmissions,
        },
        submissionContent,
        teacher: ticket.teacher,
        commissionAmount: ticket.commissionAmount,
      },
      status: 200,
    };
  }

  /**
   * Get teacher's completed tickets (earnings history)
   */
  async getTeacherCompletedTickets(idTeacher: string, page = 1, limit = 20) {
    await this.assertTeacherOrAdmin(idTeacher);

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.databaseService.teacherReviewTicket.findMany({
        where: {
          idTeacher,
          status: TeacherReviewStatus.COMPLETED,
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: {
          testResult: {
            include: {
              test: {
                select: {
                  idTest: true,
                  title: true,
                  testType: true,
                },
              },
              user: {
                select: {
                  idUser: true,
                  nameUser: true,
                },
              },
            },
          },
        },
      }),
      this.databaseService.teacherReviewTicket.count({
        where: {
          idTeacher,
          status: TeacherReviewStatus.COMPLETED,
        },
      }),
    ]);

    return {
      message: 'Completed tickets retrieved successfully',
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      status: 200,
    };
  }

  /**
   * Get teacher's earnings summary
   */
  async getTeacherEarnings(idTeacher: string) {
    await this.assertTeacherOrAdmin(idTeacher);

    const completedTickets =
      await this.databaseService.teacherReviewTicket.findMany({
        where: {
          idTeacher,
          status: TeacherReviewStatus.COMPLETED,
        },
        select: {
          commissionAmount: true,
          submittedAt: true,
          type: true,
        },
      });

    const totalEarnings = completedTickets.reduce(
      (sum, ticket) => sum + (ticket.commissionAmount || 0),
      0,
    );

    const writingCount = completedTickets.filter(
      (t) => t.type === ReviewType.WRITING,
    ).length;
    const speakingCount = completedTickets.filter(
      (t) => t.type === ReviewType.SPEAKING,
    ).length;

    return {
      message: 'Earnings retrieved successfully',
      data: {
        totalEarnings,
        completedCount: completedTickets.length,
        writingCount,
        speakingCount,
        recentEarnings: completedTickets.slice(0, 10),
      },
      status: 200,
    };
  }

  /**
   * Check if student already has a pending/claimed ticket for this test result
   */
  async checkExistingTicketForStudent(idTestResult: string, idUser: string) {
    const existingTicket =
      await this.databaseService.teacherReviewTicket.findFirst({
        where: {
          idTestResult,
          idUser,
          status: {
            in: [
              TeacherReviewStatus.PENDING,
              TeacherReviewStatus.CLAIMED,
              TeacherReviewStatus.IN_PROGRESS,
            ],
          },
        },
        select: {
          idTicket: true,
          status: true,
          createdAt: true,
          teacher: { select: { nameUser: true, idUser: true } },
        },
      });
    return existingTicket;
  }

  /**
   * Get all tickets for a specific student
   */
  async getStudentTickets(
    idUser: string,
    filters?: { status?: TeacherReviewStatus; page?: number; limit?: number },
  ) {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = { idUser };
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.databaseService.teacherReviewTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testResult: {
            include: {
              test: { select: { idTest: true, title: true, testType: true } },
            },
          },
          teacher: { select: { idUser: true, nameUser: true, avatar: true } },
        },
      }),
      this.databaseService.teacherReviewTicket.count({ where }),
    ]);

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find the teacher with the least tickets (for auto-assign)
   * Returns null if no teachers available
   */
  async findLeastBusyTeacher() {
    const teachers = await this.databaseService.user.findMany({
      where: { role: Role.GIAOVIEN },
      select: {
        idUser: true,
        nameUser: true,
        avatar: true,
        _count: {
          select: {
            teacherReviewTicketsAsTeacher: {
              where: {
                status: {
                  in: [
                    TeacherReviewStatus.CLAIMED,
                    TeacherReviewStatus.IN_PROGRESS,
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Defensive: If no teachers, return null
    if (!teachers || teachers.length === 0) {
      return null;
    }

    // Find teacher with least tickets
    const leastBusy = teachers.reduce(
      (min, t) =>
        t._count.teacherReviewTicketsAsTeacher < min.count
          ? { teacher: t, count: t._count.teacherReviewTicketsAsTeacher }
          : min,
      { teacher: teachers[0], count: Infinity },
    );

    return leastBusy.teacher;
  }

  /**
   * Get all tickets (for admin) with filters and pagination
   */
  async getAllTickets(filters: {
    status?: TeacherReviewStatus;
    type?: ReviewType;
    teacherId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, teacherId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (teacherId) where.idTeacher = teacherId;

    const [tickets, total] = await Promise.all([
      this.databaseService.teacherReviewTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testResult: {
            include: {
              test: { select: { idTest: true, title: true, testType: true } },
              user: { select: { idUser: true, nameUser: true, avatar: true } },
            },
          },
          teacher: { select: { idUser: true, nameUser: true, avatar: true } },
        },
      }),
      this.databaseService.teacherReviewTicket.count({ where }),
    ]);

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get statistics for admin dashboard
   */
  async getStats() {
    const [pending, claimed, inProgress, completed, cancelled] =
      await Promise.all([
        this.databaseService.teacherReviewTicket.count({
          where: { status: TeacherReviewStatus.PENDING },
        }),
        this.databaseService.teacherReviewTicket.count({
          where: { status: TeacherReviewStatus.CLAIMED },
        }),
        this.databaseService.teacherReviewTicket.count({
          where: { status: TeacherReviewStatus.IN_PROGRESS },
        }),
        this.databaseService.teacherReviewTicket.count({
          where: { status: TeacherReviewStatus.COMPLETED },
        }),
        this.databaseService.teacherReviewTicket.count({
          where: { status: TeacherReviewStatus.CANCELLED },
        }),
      ]);

    const totalCommission = await this.databaseService.teacherReviewTicket.aggregate({
      where: { status: TeacherReviewStatus.COMPLETED },
      _sum: { commissionAmount: true },
    });

    return {
      pending,
      claimed,
      inProgress,
      completed,
      cancelled,
      totalCommission: totalCommission._sum.commissionAmount || 0,
    };
  }

  /**
   * Cancel a ticket (student or admin)
   */
  async cancelTicket(idTicket: string, requesterId: string, requesterRole: Role) {
    const ticket = await this.databaseService.teacherReviewTicket.findUnique({
      where: { idTicket },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Only PENDING tickets can be cancelled
    if (ticket.status !== TeacherReviewStatus.PENDING) {
      throw new BadRequestException('Only pending tickets can be cancelled');
    }

    // Student can only cancel their own tickets
    if (requesterRole === Role.USER && ticket.idUser !== requesterId) {
      throw new ForbiddenException('You can only cancel your own tickets');
    }

    const updatedTicket = await this.databaseService.teacherReviewTicket.update({
      where: { idTicket },
      data: { status: TeacherReviewStatus.CANCELLED },
    });

    return {
      message: 'Ticket cancelled successfully',
      data: updatedTicket,
    };
  }

  /**
   * Get teachers with their current workload
   */
  async getTeachersLoad() {
    const teachers = await this.databaseService.user.findMany({
      where: { role: Role.GIAOVIEN },
      select: {
        idUser: true,
        nameUser: true,
        avatar: true,
        _count: {
          select: {
            teacherReviewTicketsAsTeacher: {
              where: {
                status: {
                  in: [
                    TeacherReviewStatus.CLAIMED,
                    TeacherReviewStatus.IN_PROGRESS,
                  ],
                },
              },
            },
          },
        },
      },
    });

    return teachers.map((t) => ({
      idUser: t.idUser,
      nameUser: t.nameUser,
      avatar: t.avatar,
      currentLoad: t._count.teacherReviewTicketsAsTeacher,
    }));
  }

  /**
   * Auto-assign ticket based on assign mode
   */
  private async determineAssignment(): Promise<{
    teacherId: string | null;
    status: TeacherReviewStatus;
  }> {
    const assignMode = await this.systemConfigService.getAssignMode();

    if (assignMode === AssignMode.AUTO) {
      const teacher = await this.findLeastBusyTeacher();
      if (teacher) {
        return {
          teacherId: teacher.idUser,
          status: TeacherReviewStatus.CLAIMED,
        };
      }
    }

    // Fallback to MANUAL mode or no teachers available
    return {
      teacherId: null,
      status: TeacherReviewStatus.PENDING,
    };
  }
}
