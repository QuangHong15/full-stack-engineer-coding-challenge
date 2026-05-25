import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsIn } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class CreateCatalogVersionDto {
  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ required: false, enum: TRADE_CODES })
  @IsNotEmpty()
  @IsString()
  @IsIn(TRADE_CODES)
  trade: TradeCode;
}
