import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAbnormalDto {
  @ApiPropertyOptional({ description: '处理备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}