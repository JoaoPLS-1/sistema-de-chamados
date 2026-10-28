import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PrioridadeChamado } from '../../generated/prisma/enums.js';

export class CriarChamadoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5, { message: 'O título deve ter no mínimo 5 caracteres' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres' })
  titulo: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10, { message: 'A descrição deve ter no mínimo 10 caracteres' })
  descricao: string;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;

  @IsInt()
  @Min(1)
  solicitanteId: number;

  @IsInt()
  @Min(1)
  tipoProblemaId: number;
}
