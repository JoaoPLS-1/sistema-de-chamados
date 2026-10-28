import { IsEnum } from 'class-validator';
import { SituacaoChamado } from '../../generated/prisma/enums.js';

export class AlterarSituacaoDto {
  @IsEnum(SituacaoChamado)
  situacao: SituacaoChamado;
}
