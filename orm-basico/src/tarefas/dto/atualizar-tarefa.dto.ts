import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AtualizarTarefaDto {
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MaxLength(191, { message: 'O título deve ter no máximo 191 caracteres' })
  titulo?: string;

  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsBoolean({ message: 'A situação deve ser um booleano' })
  concluida?: boolean;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  descricao?: string | null;
}
