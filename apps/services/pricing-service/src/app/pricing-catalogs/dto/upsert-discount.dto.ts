import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertDiscountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  flatCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  capCents?: number;

  @ApiProperty()
  @IsNotEmpty()
  appliesTo: 'subtotal' | { positionKeys: string[] };
}
