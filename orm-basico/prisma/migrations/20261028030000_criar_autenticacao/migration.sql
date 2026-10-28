CREATE TABLE `Credencial` (
    `pessoaId` INTEGER NOT NULL,
    `senhaHash` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`pessoaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Sessao` (
    `tokenHash` CHAR(64) NOT NULL,
    `pessoaId` INTEGER NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    INDEX `Sessao_pessoaId_idx`(`pessoaId`),
    INDEX `Sessao_expiraEm_idx`(`expiraEm`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Credencial` ADD CONSTRAINT `Credencial_pessoaId_fkey` FOREIGN KEY (`pessoaId`) REFERENCES `Pessoa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Sessao` ADD CONSTRAINT `Sessao_pessoaId_fkey` FOREIGN KEY (`pessoaId`) REFERENCES `Pessoa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
