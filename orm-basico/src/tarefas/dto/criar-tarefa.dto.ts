import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarTarefaDto {
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MaxLength(191, { message: 'O título deve ter no máximo 191 caracteres' })
  titulo: string;
}
