import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryCheckDto {
  @ApiPropertyOptional({ description: '实际盘点数量', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualQuantity?: number;

  @ApiPropertyOptional({ description: '盘点备注', example: '与账面一致' })
  @IsOptional()
  @IsString()
  remark?: string;
}