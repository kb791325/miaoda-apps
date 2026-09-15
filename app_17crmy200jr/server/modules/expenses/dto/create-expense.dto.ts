import { IsString, IsNumber, IsOptional, IsDateString, IsNotEmpty, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ExpenseAssetLinkDto } from '@shared/api.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ description: '支出日期', example: '2026-09-05' })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ description: '支出金额', example: 100.00, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '支出描述', example: '办公用品采购' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: '一级分类', example: '日常行政' })
  @IsString()
  @IsNotEmpty()
  categoryL1: string;

  @ApiProperty({ description: '二级分类', example: '办公用品' })
  @IsString()
  @IsNotEmpty()
  categoryL2: string;

  @ApiProperty({ description: '付款主体', example: '河韵' })
  @IsString()
  @IsNotEmpty()
  payerEntity: string;

  @ApiProperty({ description: '楼层', example: '26楼' })
  @IsString()
  @IsNotEmpty()
  floor: string;

  @ApiProperty({ description: '部门', example: '行政部' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ description: '采购部门', example: '行政部' })
  @IsString()
  @IsNotEmpty()
  purchaseDepartment: string;

  @ApiProperty({ description: '经办人ID', example: 'user_xxx' })
  @IsString()
  @IsNotEmpty()
  handler: string;

  @ApiPropertyOptional({ description: '发票URL' })
  @IsOptional()
  @IsString()
  invoiceUrl?: string;

  @ApiPropertyOptional({ description: '截图URL' })
  @IsOptional()
  @IsString()
  screenshotUrl?: string;

  @ApiPropertyOptional({ description: '是否同时创建固定资产' })
  @IsOptional()
  @IsBoolean()
  createAsset?: boolean;

  @ApiPropertyOptional({ description: '关联资产信息' })
  @IsOptional()
  @Type(() => Object)
  asset?: ExpenseAssetLinkDto;
}