-- CreateTable
CREATE TABLE `Chamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(100) NOT NULL,
    `descricao` LONGTEXT NOT NULL,
    `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    `situacao` ENUM('ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO', 'FECHADO', 'CANCELADO') NOT NULL DEFAULT 'ABERTO',
    `solicitanteId` INTEGER NOT NULL,
    `tecnicoId` INTEGER NULL,
    `tipoProblemaId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `resolvidoEm` DATETIME(3) NULL,

    INDEX `Chamado_tecnicoId_situacao_idx`(`tecnicoId`, `situacao`),
    INDEX `Chamado_situacao_idx`(`situacao`),
    INDEX `Chamado_prioridade_idx`(`prioridade`),
    INDEX `Chamado_tipoProblemaId_idx`(`tipoProblemaId`),
    INDEX `Chamado_solicitanteId_idx`(`solicitanteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `Pessoa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `Pessoa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_tipoProblemaId_fkey` FOREIGN KEY (`tipoProblemaId`) REFERENCES `TipoProblema`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
