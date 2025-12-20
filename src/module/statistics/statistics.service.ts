import { BadRequestException, Injectable } from '@nestjs/common';
import { differenceInDays, format } from 'date-fns';
import { DatabaseService } from 'src/database/database.service';
import { CreateTargetExam } from './dto/create-target-exam.dto';
import { TestType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: DatabaseService) {}

  async OverAllScore(idUser: string){
    const existingUser = await this.prisma.user.findUnique({
      where:{idUser}
    })

    if(!existingUser) throw new BadRequestException('User not found')
      
    const testResult = await this.prisma.userTestResult.findMany({
      where:{idUser, status: 'FINISHED'},
      select:{
        band_score: true,
        test : {
          select: {
            testType: true
          }
        },
      }
    })

    const roundToIeltsScore = (score: number): number => {
    return Math.round(score * 2) / 2;
  };

    const groupTest = {
    READING: testResult.filter((t) => t.test.testType === 'READING'),
    LISTENING: testResult.filter((t) => t.test.testType === 'LISTENING'),
    WRITING: testResult.filter((t) => t.test.testType === 'WRITING'),
    SPEAKING: testResult.filter((t) => t.test.testType === 'SPEAKING'), 
  };

    const averages = Object.entries(groupTest).map(([type, tests]) =>{
    const scores = (tests as typeof testResult).map((t) => t.band_score);
    
    const rawAvg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return { 
      type, 
      avg: roundToIeltsScore(rawAvg)
    };
  });

  const totalScore = averages.reduce((sum, item) => sum + item.avg, 0);

  const rawOverall = averages.length > 0 ? totalScore / averages.length : 0;


  return {
    message: "Overall score is retrieved successfully",
    overall: roundToIeltsScore(rawOverall),
    details: averages,
    status: 200
  };
}

  async statistic(idUser: string) {
    // 1. Kiểm tra User tồn tại
    const existingUser = await this.prisma.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    // 2. Lấy danh sách kết quả (chỉ lấy các trường cần thiết)
    const testResults = await this.prisma.userTestResult.findMany({
      where: { 
        idUser, 
        status: 'FINISHED' 
      },
      select: {
        band_score: true,
        createdAt: true,
        test: {
          select: {
            testType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 3. Định nghĩa kiểu dữ liệu cho việc nhóm
    type SkillData = { totalScore: number; count: number };
    type DayGroup = Record<string, SkillData>; 

    const groupedByDate: Record<string, DayGroup> = {};

    // 4. Nhóm dữ liệu theo ngày và theo kỹ năng
    testResults.forEach((result) => {
      const dateKey = result.createdAt.toISOString().split('T')[0]; // Lấy định dạng YYYY-MM-DD
      const type = result.test.testType;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }

      if (!groupedByDate[dateKey][type]) {
        groupedByDate[dateKey][type] = { totalScore: 0, count: 0 };
      }

      groupedByDate[dateKey][type].totalScore += result.band_score;
      groupedByDate[dateKey][type].count += 1;
    });

    // 5. Hàm làm tròn chuẩn IELTS (0.25 -> 0.5, 0.75 -> 1.0)
    const roundToIelts = (score: number): number => {
      return Math.round(score * 2) / 2;
    };

    // 6. Tính toán kết quả cuối cùng
    const statistics = Object.entries(groupedByDate).map(([date, skills]) => {
      // Tính trung bình từng kỹ năng trong ngày đó
      const readingAvg = skills[TestType.READING] ? skills[TestType.READING].totalScore / skills[TestType.READING].count : 0;
      const listeningAvg = skills[TestType.LISTENING] ? skills[TestType.LISTENING].totalScore / skills[TestType.LISTENING].count : 0;
      const writingAvg = skills[TestType.WRITING] ? skills[TestType.WRITING].totalScore / skills[TestType.WRITING].count : 0;
      const speakingAvg = skills[TestType.SPEAKING] ? skills[TestType.SPEAKING].totalScore / skills[TestType.SPEAKING].count : 0;

      // Tính Overall chuẩn: (Trung bình R + Trung bình L + Trung bình W + Trung bình S) / 4
      const dailyOverall = (readingAvg + listeningAvg + writingAvg + speakingAvg) / 4;

      return {
        date,
        OVERALL: roundToIelts(dailyOverall),
        READING: roundToIelts(readingAvg),
        LISTENING: roundToIelts(listeningAvg),
        WRITING: roundToIelts(writingAvg),
        SPEAKING: roundToIelts(speakingAvg),
      };
    });

    return {
      message: 'Statistics retrieved successfully',
      data: statistics,
      status: 200,
    };
  }

  async addTargetExam(idUser: string, createTargetExam: CreateTargetExam){
     const existingUser = await this.prisma.user.findUnique({
      where:{idUser}
    })

    if(!existingUser) throw new BadRequestException('User not found')

      const {targetExamDate, targetBandScore} = createTargetExam;
      
      const data = await this.prisma.user.update({
        where:{idUser},
        data:{
          ...(targetExamDate && { targetExamDate: new Date(targetExamDate) }),
        ...(targetBandScore && { targetBandScore: targetBandScore }),
        },
        select: {
        targetExamDate: true,
        targetBandScore: true,
      }
      })

      let daysRemaining = 0;

      if (data.targetExamDate) {
      const today = new Date();
      // differenceInDays trả về số nguyên (ngày đích - ngày hiện tại)
      const diff = differenceInDays(data.targetExamDate, today);
      
      // Nếu kết quả > 0 thì lấy, nếu âm (đã qua ngày thi) thì trả về 0
      daysRemaining = diff > 0 ? diff : 0;
    }

    return {
      message: "Target updated successfully",
      data: {
        targetBandScore: data.targetBandScore,
        targetExamDate: data.targetExamDate,
        daysRemaining: daysRemaining
      },
      status: 200
    };
  }

  async getTargetExam(idUser: string){
     const data = await this.prisma.user.findUnique({
      where:{idUser},
      select:{
        targetBandScore: true,
        targetExamDate: true
      }
    })

    if(!data) throw new BadRequestException('User not found')

    return {
      message: "Target exam retrieved successfully",
      data,
      status: 200
    }
  }
}
