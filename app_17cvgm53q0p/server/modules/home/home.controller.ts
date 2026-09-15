import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HomeService } from './home.service';
import type { HomeTodoItem } from './home.service';
import { AppAuthGuard } from '../auth/app-auth.guard';

@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * 工作台待办事项：登录即可按角色查看自己的待办，不加 @RequirePermissions。
   * role 未知/缺失时返回 { items: [] }。
   */
  @UseGuards(AppAuthGuard)
  @Get('todos')
  getTodos(@Query('role') role?: string): Promise<{ items: HomeTodoItem[] }> {
    return this.homeService.getTodos(role);
  }
}
