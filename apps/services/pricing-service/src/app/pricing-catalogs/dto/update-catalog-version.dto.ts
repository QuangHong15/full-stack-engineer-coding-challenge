import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertPositionDto } from './upsert-position.dto';
import { UpsertDiscountDto } from './upsert-discount.dto';

export class UpdateCatalogVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ type: [UpsertPositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertPositionDto)
  positions?: UpsertPositionDto[];

  @ApiPropertyOptional({ type: [UpsertDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertDiscountDto)
  discounts?: UpsertDiscountDto[];
}
