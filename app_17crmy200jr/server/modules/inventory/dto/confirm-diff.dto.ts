import { IsString, IsOptional, IsInt, IsNotEmpty, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmDiffDto {
  @ApiProperty({ description: '确认类型', example: 'loss' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['profit', 'loss', 'adjust'] as const)
  confirmType: 'profit' | 'loss' | 'adjust';

  @ApiPropertyOptional({ description: '调整后库存数量', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  adjustStock?: number;

  @ApiPropertyOptional({ description: '备注', example: '已核实' })
  @IsOptional()
  @IsString()
  remark?: string;
}