import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: '角色编码', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @ApiProperty({ description: '角色名称', example: '管理员' })
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @ApiPropertyOptional({ description: '角色描述' })
  @IsOptional()
  @IsString()
  roleDescription?: string;

  @ApiPropertyOptional({ description: '是否系统角色', example: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: '菜单权限' })
  @IsOptional()
  @IsObject()
  menuPermissions?: Record<string, boolean>;

  @ApiPropertyOptional({ description: '数据权限' })
  @IsOptional()
  @IsObject()
  dataPermissions?: Record<string, string>;

  @ApiPropertyOptional({ description: '操作权限' })
  @IsOptional()
  @IsObject()
  operationPermissions?: Record<string, Record<string, boolean>>;
}