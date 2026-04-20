import { PrismaClient, Prisma } from '@prisma/client';

export class NeonService {
  private prisma: PrismaClient;

  constructor(connectionString: string) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  async updateWritingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      aiOverallScore: number;
      aiDetailedFeedback: Prisma.InputJsonValue;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userWritingSubmission.update({
      where: { idWritingSubmission: submissionId },
      data,
    });
  }

  async updateSpeakingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      transcript?: string;
      aiOverallScore: number;
      aiDetailedFeedback: Prisma.InputJsonValue;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userSpeakingSubmission.update({
      where: { idSpeakingSubmission: submissionId },
      data,
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createNeonService(): NeonService {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new NeonService(connectionString);
}