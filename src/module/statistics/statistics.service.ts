import { BadRequestException, Injectable } from '@nestjs/common';
import { differenceInDays, format } from 'date-fns';
import { DatabaseService } from 'src/database/database.service';
import { CreateTargetExam } from './dto/create-target-exam.dto';

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

  async statistic(idUser: string){
    const existingUser = await this.prisma.user.findUnique({
      where:{idUser}
    })

    if(!existingUser) throw new BadRequestException('User not found')

    const testResults = await this.prisma.userTestResult.findMany({
      where:{idUser, status: 'FINISHED'},
      select:{
        band_score: true,
        test : {
          select: {
            testType: true
          }
        },
        createdAt: true,
      },
      orderBy:{
        createdAt: 'asc'
      }
    })

    type SkillStats = { total: number; count: number };
    type DayData = {
      [key in 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING']?: SkillStats;
    };

    const roundToIeltsScore = (score: number): number => {
    return Math.round(score * 2) / 2;
    };

    const groupedByDate: Record<string, DayData> = {};

    testResults.forEach((result) => {
      const dateKey = format(result.createdAt, 'yyyy-MM-dd');
      const type = result.test.testType;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }

      // Nếu chưa có dữ liệu cho kỹ năng này trong ngày thì khởi tạo
      if (!groupedByDate[dateKey][type]) {
        groupedByDate[dateKey][type] = { total: 0, count: 0 };
      }

      // Cộng dồn điểm và số lượng
      groupedByDate[dateKey][type]!.total += result.band_score;
      groupedByDate[dateKey][type]!.count += 1;
    });

    const statistics = Object.entries(groupedByDate).map(([date, skills]) => {
      // Hàm tính trung bình nhỏ gọn
      const calculateAvg = (skillData?: SkillStats) => 
        skillData ? parseFloat((skillData.total / skillData.count).toFixed(2)) : 0;

      let dayTotalScore = 0;
      

      Object.values(skills).forEach((skill) => {
        dayTotalScore += skill.total;
      });

      const dailyOverall = dayTotalScore > 0 
        ? parseFloat((dayTotalScore / 4).toFixed(2)) 
        : 0;

      return {
        date,
        OVERALL: roundToIeltsScore(dailyOverall),
        READING: roundToIeltsScore(calculateAvg(skills['READING'])),
        LISTENING: roundToIeltsScore(calculateAvg(skills['LISTENING'])),
        WRITING: roundToIeltsScore(calculateAvg(skills['WRITING'])),
        SPEAKING: roundToIeltsScore(calculateAvg(skills['SPEAKING'])),
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
}
