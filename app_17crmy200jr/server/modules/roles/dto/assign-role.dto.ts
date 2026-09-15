import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: '角色ID列表', example: ['role_001', 'role_002'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roleIds: string[];
}