import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { DefinirSenhaDto } from '../auth/dto.js';
import { CriarPessoaDto } from '../pessoas/dto/criar-pessoa.dto.js';

// JSON recebido pelo stdin pelo assistente PowerShell; senha nunca vai nos argumentos.
async function main() {
  let entrada = '';
  for await (const trecho of process.stdin) entrada += String(trecho);
  const dados = JSON.parse(entrada) as Record<string, unknown>;
  const cadastro = plainToInstance(CriarPessoaDto, dados);
  const credencial = plainToInstance(DefinirSenhaDto, dados);
  await validateOrReject(cadastro, { whitelist: true });
  await validateOrReject(credencial, { whitelist: true });
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const pessoa = await prisma.pessoa.upsert({
      where: { email: cadastro.email },
      create: {
        nome: cadastro.nome,
        email: cadastro.email,
        tipo: cadastro.tipo,
      },
      update: {},
    });
    await new AuthService(prisma).definirSenha(pessoa.id, credencial.senha);
    console.log(
      `Acesso definido para pessoa ${pessoa.id} (${pessoa.tipo}). Sessões anteriores revogadas.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'Não foi possível definir o acesso. Verifique os dados (senha de 8 a 128 caracteres), a conexão e as migrações.',
  );
  process.exitCode = 1;
});
