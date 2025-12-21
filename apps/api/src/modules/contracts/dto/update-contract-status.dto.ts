import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

export class UpdateContractStatusDto {
  @ApiProperty({
    description: 'Neuer Vertragsstatus',
    enum: ContractStatus,
    example: ContractStatus.ACTIVE,
  })
  @IsEnum(ContractStatus, { message: 'Ungültiger Vertragsstatus' })
  @IsNotEmpty({ message: 'Status ist erforderlich' })
  status!: ContractStatus;
}
