import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ExpenseAssetLinkDto } from '@shared/api.interface';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExpenseDto {
  @ApiPropertyOptional({ description: '支出日期' })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({ description: '支出金额' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: '支出描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '一级分类' })
  @IsOptional()
  @IsString()
  categoryL1?: string;

  @ApiPropertyOptional({ description: '二级分类' })
  @IsOptional()
  @IsString()
  categoryL2?: string;

  @ApiPropertyOptional({ description: '付款主体' })
  @IsOptional()
  @IsString()
  payerEntity?: string;

  @ApiPropertyOptional({ description: '楼层' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: '部门' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: '采购部门' })
  @IsOptional()
  @IsString()
  purchaseDepartment?: string;

  @ApiPropertyOptional({ description: '经办人ID' })
  @IsOptional()
  @IsString()
  handler?: string;

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