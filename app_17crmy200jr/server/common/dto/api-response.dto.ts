import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiPropertyOptional({ description: '错误信息', example: '资源不存在' })
  message?: string;
}

export class PaginatedMetaDto {
  @ApiProperty({ description: '总数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  pageSize: number;
}

export class PaginatedResponseDto<T = unknown> {
  @ApiProperty({ description: '数据列表', isArray: true })
  items: T[];

  @ApiProperty({ description: '分页元信息', type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}

export class BatchOperationResultDto {
  @ApiProperty({ description: '成功数量', example: 10 })
  successCount: number;

  @ApiProperty({ description: '失败数量', example: 0 })
  failCount: number;

  @ApiPropertyOptional({ description: '错误信息列表', isArray: true })
  errors?: string[];
}

export class ErrorResponseDto {
  @ApiProperty({ description: '状态码', example: 404 })
  statusCode: number;

  @ApiProperty({ description: '错误信息', example: '资源不存在' })
  message: string;

  @ApiPropertyOptional({ description: '错误详情' })
  error?: string;
}