import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: '接收用户ID', example: 'user_xxx' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '通知类型', example: 'inventory_alert' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: '通知标题', example: '盘点提醒' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '通知内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '关联类型', example: 'inventory_check' })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: '关联ID' })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiProperty({
    description: '优先级',
    enum: ['low', 'normal', 'high'],
    example: 'normal',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['low', 'normal', 'high'])
  priority: 'low' | 'normal' | 'high';
}