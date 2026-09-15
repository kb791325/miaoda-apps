import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FollowUpService } from './follow-up.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import {
  getRequestOperator,
  getOperatorContext,
} from '@server/common/utils/operator';
import type {
  CreateFollowUpRequest,
  FollowUpCurrentUserResponse,
} from '@shared/follow-up';

@Controller('api/follow-ups')
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('followup:view')
  @Get()
  list(@Req() req: Request, @Query('customerId') customerId?: string) {
    return this.followUpService.list(customerId, getOperatorContext(req));
  }

  /** 默认跟进人：优先应用账号，未登录平台态回退飞书用户 */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('followup:manage')
  @Get('current-user')
  currentUser(@Req() req: Request): FollowUpCurrentUserResponse {
    return {
      userId: getRequestOperator(req),
      name: req.appUser?.name ?? '',
    };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('followup:manage')
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFollowUpRequest) {
    return this.followUpService.create(dto, getRequestOperator(req));
  }
}
