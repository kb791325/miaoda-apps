import { IsString, IsNumber, IsOptional, IsDateString, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFixedAssetDto {
  @ApiProperty({ description: '资产名称', example: 'ThinkPad X1 Carbon' })
  @IsString()
  @IsNotEmpty()
  assetName: string;

  @ApiProperty({ description: '资产类型', example: '电子设备' })
  @IsString()
  assetType: string;

  @ApiProperty({ description: '资产分类', example: '办公设备' })
  @IsString()
  assetCategory: string;

  @ApiPropertyOptional({ description: '采购日期', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: '采购金额', example: 8999.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseAmount?: number;

  @ApiPropertyOptional({ description: '采购部门', example: '技术部' })
  @IsOptional()
  @IsString()
  purchaseDepartment?: string;

  @ApiPropertyOptional({ description: '付款主体', example: 'XX科技有限公司' })
  @IsOptional()
  @IsString()
  payerEntity?: string;

  @ApiPropertyOptional({ description: '所在楼层', example: '12F' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: '经办人', example: 'user_xxx' })
  @IsOptional()
  @IsString()
  handler?: string;

  @ApiPropertyOptional({ description: '责任人', example: 'user_xxx' })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({ description: '当前库存', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;
}