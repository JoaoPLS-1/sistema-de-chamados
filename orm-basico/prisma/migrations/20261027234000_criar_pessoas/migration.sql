-- CreateTable
CREATE TABLE `Pessoa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `tipo` ENUM('SOLICITANTE', 'TECNICO') NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `temHistoricoChamados` BOOLEAN NOT NULL DEFAULT false,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadaEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pessoa_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
