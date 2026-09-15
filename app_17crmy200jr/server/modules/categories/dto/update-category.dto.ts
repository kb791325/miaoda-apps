import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '一级类目名称' })
  @IsOptional()
  @IsString()
  categoryL1?: string;

  @ApiPropertyOptional({ description: '二级类目名称' })
  @IsOptional()
  @IsString()
  categoryL2?: string;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}