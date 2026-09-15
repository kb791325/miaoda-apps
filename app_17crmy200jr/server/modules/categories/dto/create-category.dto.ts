import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: '一级类目名称', example: '日常行政' })
  @IsString()
  @IsNotEmpty()
  categoryL1: string;

  @ApiPropertyOptional({ description: '二级类目名称', example: '办公用品' })
  @IsString()
  @IsNotEmpty()
  categoryL2: string;

  @ApiPropertyOptional({ description: '排序', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}