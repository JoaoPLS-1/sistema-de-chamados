import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Min, ValidateIf } from 'class-validator';
import {
  PrioridadeChamado,
  SituacaoChamado,
} from '../../generated/prisma/enums.js';

const converterId = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;

export class FiltrarChamadosDto {
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsEnum(SituacaoChamado)
  situacao?: SituacaoChamado;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(converterId)
  @IsInt()
  @Min(1)
  tipoProblemaId?: number;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(converterId)
  @IsInt()
  @Min(1)
  tecnicoId?: number;
}
