import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';
import type { UserSearchResponse } from '@shared/api.interface';

@ApiTags('用户')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: '搜索用户' })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'pageSize', required: false, description: '返回数量' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<UserSearchResponse> {
    if (!keyword?.trim()) {
      return { items: [] };
    }
    const items = await this.usersService.searchUsers(
      keyword.trim(),
      pageSize ? Number(pageSize) : 20,
    );
    return { items };
  }
}
