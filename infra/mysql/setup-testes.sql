-- Modelo para preparar o banco de integração usando um administrador MySQL.
-- Execute após criar tarefas_app com infra/mysql/setup.sql, ou adapte o usuário.
-- Não altera o banco tarefas nem redefine senhas.
CREATE DATABASE IF NOT EXISTS tarefas_teste
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON tarefas_teste.* TO 'tarefas_app'@'localhost';
