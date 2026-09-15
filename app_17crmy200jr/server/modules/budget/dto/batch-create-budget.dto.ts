import { IsArray, ValidateNested, IsInt, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BudgetItem {
  @ApiProperty({ description: '部门', example: '行政部' })
  @IsString()
  department: string;

  @ApiProperty({ description: '预算金额', example: 50000.00 })
  @IsNumber()
  @Min(0)
  budgetAmount: number;
}

export class BatchCreateBudgetDto {
  @ApiProperty({ description: '预算列表', type: [BudgetItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItem)
  items: BudgetItem[];

  @IsInt()
  year: number;

  @IsString()
  month: string;
}