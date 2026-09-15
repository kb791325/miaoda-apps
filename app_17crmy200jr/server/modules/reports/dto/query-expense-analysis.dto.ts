import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryExpenseAnalysisDto {
  @ApiPropertyOptional({ description: '时间维度', enum: ['month', 'quarter'], default: 'month' })
  @IsOptional()
  @IsString()
  @IsIn(['month', 'quarter'])
  timeDimension: 'month' | 'quarter' = 'month';

  @ApiPropertyOptional({ description: '分析维度', enum: ['category', 'entity', 'floor', 'department'], default: 'category' })
  @IsOptional()
  @IsString()
  @IsIn(['category', 'entity', 'floor', 'department'])
  dimension: 'category' | 'entity' | 'floor' | 'department' = 'category';

  @ApiPropertyOptional({ description: '开始日期', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}