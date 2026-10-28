import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CorpoComentarioDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'O comentário não pode ser vazio' })
  corpo: string;
}

export class CriarComentarioDto extends CorpoComentarioDto {
  @IsInt()
  @Min(1)
  autorId: number;
}
