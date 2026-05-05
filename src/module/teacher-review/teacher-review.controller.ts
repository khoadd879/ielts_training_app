import {
  ForbiddenException,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TeacherReviewService } from './teacher-review.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('teacher-review')
export class TeacherReviewController {
  constructor(private readonly teacherReviewService: TeacherReviewService) {}

  private getRequestUserId(req: { user?: { userId?: string } }): string {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Invalid access token payload');
    }
    return userId;
  }

  private assertRequestUser(
    req: { user?: { userId?: string } },
    expectedUserId: string,
  ): void {
    const requestUserId = this.getRequestUserId(req);
    if (requestUserId !== expectedUserId) {
      throw new ForbiddenException(
        'You can only perform actions for your own account',
      );
    }
  }

  @Post('request-review/:idTestResult/:idUser')
  @ApiOperation({
    summary: 'Yêu cầu giáo viên chấm bài',
    description:
      'Học viên yêu cầu giáo viên chấm lại bài Writing/Speaking sau khi AI đã chấm',
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test' })
  @ApiParam({ name: 'idUser', description: 'ID của học viên' })
  @ApiResponse({ status: 201, description: 'Yêu cầu thành công' })
  requestReview(
    @Param('idTestResult') idTestResult: string,
    @Param('idUser') idUser: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idUser);
    return this.teacherReviewService.requestReview(idTestResult, idUser);
  }

  @Get('pending-tickets')
  @ApiOperation({
    summary: 'Lấy danh sách ticket đang chờ',
    description: 'Lấy tất cả các ticket đang chờ được giáo viên nhận',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['WRITING', 'SPEAKING'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED'],
  })
  @ApiResponse({ status: 200, description: 'Danh sách ticket' })
  getPendingTickets(
    @Req() req: { user?: { userId?: string } },
    @Query('type') type?: 'WRITING' | 'SPEAKING',
    @Query('status')
    status?: 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED',
  ) {
    return this.teacherReviewService.getPendingTickets(
      { type, status },
      this.getRequestUserId(req),
    );
  }

  @Get('queue/:idTeacher')
  @ApiOperation({
    summary: 'Lấy hàng đợi của giáo viên',
    description: 'Lấy các ticket mà giáo viên đã nhận',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiResponse({ status: 200, description: 'Hàng đợi của giáo viên' })
  getTeacherQueue(
    @Param('idTeacher') idTeacher: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.getTeacherQueue(
      idTeacher,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('claim-ticket/:idTeacher/:idTicket')
  @ApiOperation({
    summary: 'Giáo viên nhận ticket',
    description: 'Giáo viên nhận một ticket để chấm bài',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiParam({ name: 'idTicket', description: 'ID của ticket' })
  @ApiResponse({ status: 200, description: 'Nhận thành công' })
  claimTicket(
    @Param('idTeacher') idTeacher: string,
    @Param('idTicket') idTicket: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.claimTicket(idTeacher, idTicket);
  }

  @Post('unclaim-ticket/:idTeacher/:idTicket')
  @ApiOperation({
    summary: 'Giáo viên bỏ nhận ticket',
    description: 'Giáo viên từ chối nhận ticket (quay lại hàng đợi)',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiParam({ name: 'idTicket', description: 'ID của ticket' })
  @ApiResponse({ status: 200, description: 'Bỏ nhận thành công' })
  unclaimTicket(
    @Param('idTeacher') idTeacher: string,
    @Param('idTicket') idTicket: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.unclaimTicket(idTeacher, idTicket);
  }

  @Patch('submit-score/:idTeacher/:idTicket')
  @ApiOperation({
    summary: 'Giáo viên nộp điểm',
    description: 'Giáo viên hoàn thành chấm bài và nộp điểm',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiParam({ name: 'idTicket', description: 'ID của ticket' })
  @ApiResponse({ status: 200, description: 'Nộp điểm thành công' })
  submitScore(
    @Param('idTeacher') idTeacher: string,
    @Param('idTicket') idTicket: string,
    @Body() dto: SubmitScoreDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.submitScore(idTeacher, idTicket, dto);
  }

  @Get('ticket/:idTicket')
  @ApiOperation({
    summary: 'Lấy chi tiết ticket',
    description: 'Lấy thông tin chi tiết của một ticket',
  })
  @ApiParam({ name: 'idTicket', description: 'ID của ticket' })
  @ApiResponse({ status: 200, description: 'Chi tiết ticket' })
  getTicketDetail(
    @Param('idTicket') idTicket: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.teacherReviewService.getTicketDetail(
      idTicket,
      this.getRequestUserId(req),
    );
  }

  @Get('completed/:idTeacher')
  @ApiOperation({
    summary: 'Lấy danh sách ticket đã hoàn thành',
    description: 'Lấy lịch sử các ticket đã chấm của giáo viên',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiResponse({ status: 200, description: 'Danh sách ticket đã hoàn thành' })
  getTeacherCompletedTickets(
    @Param('idTeacher') idTeacher: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.getTeacherCompletedTickets(
      idTeacher,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('earnings/:idTeacher')
  @ApiOperation({
    summary: 'Lấy thu nhập của giáo viên',
    description: 'Lấy tổng quan thu nhập từ việc chấm bài',
  })
  @ApiParam({ name: 'idTeacher', description: 'ID của giáo viên' })
  @ApiResponse({ status: 200, description: 'Thu nhập của giáo viên' })
  getTeacherEarnings(
    @Param('idTeacher') idTeacher: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idTeacher);
    return this.teacherReviewService.getTeacherEarnings(idTeacher);
  }

  @Get('student/check/:idTestResult')
  @ApiOperation({
    summary: 'Check nếu học viên đã yêu cầu review cho bài này',
    description: 'Kiểm tra xem đã có ticket pending/claimed cho bài test này chưa',
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của test result' })
  checkStudentTicket(@Param('idTestResult') idTestResult: string, @Req() req: { user?: { userId?: string } }) {
    const userId = this.getRequestUserId(req);
    return this.teacherReviewService.checkExistingTicketForStudent(idTestResult, userId);
  }

  @Get('student/:idUser/tickets')
  @ApiOperation({
    summary: 'Lấy danh sách ticket của học viên',
    description: 'Lấy tất cả ticket của một học viên để theo dõi tiến độ',
  })
  @ApiParam({ name: 'idUser', description: 'ID của học viên' })
  getStudentTickets(
    @Param('idUser') idUser: string,
    @Query('status') status: 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: { user?: { userId?: string } },
  ) {
    this.assertRequestUser(req, idUser);
    return this.teacherReviewService.getStudentTickets(idUser, {
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('all')
  @ApiOperation({
    summary: 'Admin: Lấy tất cả tickets',
    description: 'Lấy tất cả tickets với filter và phân trang',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['WRITING', 'SPEAKING'] })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAllTickets(
    @Query('status') status: 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    @Query('type') type: 'WRITING' | 'SPEAKING',
    @Query('teacherId') teacherId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: { user?: { userId?: string } },
  ) {
    const requesterId = this.getRequestUserId(req);
    // Only admin can access all tickets
    return this.teacherReviewService.getAllTickets({
      status,
      type,
      teacherId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Admin: Thống kê tickets',
    description: 'Lấy số lượng tickets theo từng status',
  })
  getStats(@Req() req: { user?: { userId?: string } }) {
    return this.teacherReviewService.getStats();
  }

  @Patch(':idTicket/cancel')
  @ApiOperation({
    summary: 'Hủy ticket',
    description: 'Học viên hoặc admin hủy một ticket đang PENDING',
  })
  @ApiParam({ name: 'idTicket', description: 'ID của ticket' })
  cancelTicket(
    @Param('idTicket') idTicket: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    const userId = this.getRequestUserId(req);
    return this.teacherReviewService.cancelTicket(idTicket, userId, 'USER');
  }

  @Get('teachers/load')
  @ApiOperation({
    summary: 'Admin: Lấy danh sách giáo viên với workload',
    description: 'Lấy danh sách giáo viên và số ticket đang xử lý',
  })
  getTeachersLoad(@Req() req: { user?: { userId?: string } }) {
    return this.teacherReviewService.getTeachersLoad();
  }
}
