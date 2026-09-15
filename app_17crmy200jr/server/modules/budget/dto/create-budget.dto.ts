import { IsInt, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: '预算年份', example: 2026 })
  @IsInt()
  year: number;

  @ApiProperty({ description: '预算月份(YYYY-MM)', example: '2026-09' })
  @IsString()
  month: string;

  @ApiProperty({ description: '部门', example: '行政部' })
  @IsString()
  department: string;

  @ApiProperty({ description: '预算金额', example: 50000.00 })
  @IsNumber()
  @Min(0)
  budgetAmount: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}