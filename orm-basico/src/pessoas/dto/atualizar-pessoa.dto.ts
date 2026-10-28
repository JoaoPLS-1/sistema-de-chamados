import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TipoPessoa } from '../../generated/prisma/enums.js';

export class AtualizarPessoaDto {
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(191, { message: 'O nome deve ter no máximo 191 caracteres' })
  nome?: string;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres' })
  email?: string;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsEnum(TipoPessoa, { message: 'O tipo deve ser SOLICITANTE ou TECNICO' })
  tipo?: TipoPessoa;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsBoolean({ message: 'Ativa deve ser um booleano' })
  ativa?: boolean;
}
