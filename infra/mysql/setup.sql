-- Preparacao opcional para um MySQL existente, via Workbench ou cliente mysql.
-- Execute com um administrador somente se banco/usuario ainda nao existirem.
-- Troque a senha antes de executar. Nao versione a senha real.
-- Usuario limitado a conexoes da mesma maquina do servidor MySQL.
CREATE DATABASE IF NOT EXISTS tarefas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'tarefas_app'@'localhost'
  IDENTIFIED BY 'SUBSTITUA_POR_UMA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON tarefas.* TO 'tarefas_app'@'localhost';
-- Se o usuario ja existe, CREATE USER IF NOT EXISTS preserva a senha atual.
-- Para uma API em outra maquina, o administrador deve configurar o host do
-- usuario e o acesso de rede de acordo com o ambiente.
