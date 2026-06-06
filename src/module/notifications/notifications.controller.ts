import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo cho user hiện tại',
    description:
      'Trả về unread count + danh sách items dựa trên role (student/teacher/admin). Không lưu DB — aggregate on-read.',
  })
  getNotifications(
    @Req() req: { user?: { userId?: string; role?: any } },
  ) {
    const userId = req?.user?.userId;
    const role = req?.user?.role;
    if (!userId || !role) {
      return { unreadCount: 0, items: [] };
    }
    return this.notificationsService.getForUser(userId, role);
  }
}
