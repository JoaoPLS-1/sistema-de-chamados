import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AtualizarTipoProblemaDto {
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(191, { message: 'O nome deve ter no máximo 191 caracteres' })
  nome?: string;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo?: boolean;
}
