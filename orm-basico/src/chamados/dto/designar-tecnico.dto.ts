import { IsInt, Min } from 'class-validator';

export class DesignarTecnicoDto {
  @IsInt()
  @Min(1)
  tecnicoId: number;
}
