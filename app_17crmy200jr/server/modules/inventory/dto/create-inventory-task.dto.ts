import { IsString, IsInt, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryTaskDto {
  @ApiPropertyOptional({ description: '任务名称', example: '2026年9月盘点' })
  @IsOptional()
  @IsString()
  taskName?: string;

  @ApiProperty({ description: '盘点年份', example: 2026 })
  @IsInt()
  checkYear: number;

  @ApiProperty({ description: '盘点月份', example: '09' })
  @IsString()
  checkMonth: string;

  @ApiPropertyOptional({ description: '盘点人', example: 'user_xxx' })
  @IsOptional()
  @IsString()
  checker?: string;

  @ApiPropertyOptional({ description: '盘点范围类型', example: 'all' })
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional({ description: '盘点范围值', example: ['12F'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeValue?: string[];

  @ApiPropertyOptional({ description: '资产类型筛选', example: '电子设备' })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiPropertyOptional({ description: '楼层筛选', example: '12F' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: '部门筛选', example: '技术部' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: '备注', example: '月度例行盘点' })
  @IsOptional()
  @IsString()
  remark?: string;
}