# **Sistema de Chamados: Regras de Negócio**

## **Contexto**

Uma empresa precisa de um sistema interno para registrar e acompanhar chamados de suporte. Funcionários abrem chamados descrevendo problemas, e técnicos os atendem até a resolução. Cada chamado pertence a um tipo de problema (por exemplo: rede, impressora, acesso a sistemas) e pode ter uma conversa registrada ao longo do atendimento.

## **Participantes do sistema**

Existem dois tipos de pessoas: **solicitantes**, que abrem chamados, e **técnicos**, que os atendem. Toda pessoa cadastrada tem nome e e-mail, e pode estar ativa ou inativa na empresa.

## **Regras**

### **Sobre as pessoas**

1. O e-mail identifica a pessoa e não pode se repetir. Ele precisa ter formato válido.
2. Cada pessoa é solicitante ou técnico, nunca outra coisa.
3. Pessoas inativas não podem abrir chamados, ser designadas para atendê-los nem comentar neles.
4. Quem já esteve envolvido com algum chamado não pode ser removido do sistema. Nesse caso, deve apenas ser desativado.

### **Sobre os tipos de problema**

5. Cada tipo de problema tem um nome, que não pode se repetir.
6. Não é possível abrir chamado em um tipo de problema que esteja desativado.
7. Um tipo de problema já usado em algum chamado não pode ser removido, apenas desativado.

### **Sobre os chamados**

8. Todo chamado nasce **aberto** e sem técnico responsável.
9. Quem abre o chamado deve ser um solicitante ativo.
10. O título deve ter entre 5 e 100 caracteres. A descrição deve ter no mínimo 10 caracteres.
11. A prioridade pode ser **baixa**, **média**, **alta** ou **crítica**. Se não for informada, assume **média**.
12. Apenas um técnico ativo pode ser designado para atender um chamado.
13. Quando um técnico é designado para um chamado aberto, o atendimento começa automaticamente.
14. O chamado percorre as seguintes situações:
    * Aberto → Em atendimento → Resolvido → Fechado
    * Resolvido → Em atendimento (caso o problema persista)
    * Aberto ou Em atendimento → Cancelado
    * Qualquer outro caminho é proibido.
15. Chamados fechados ou cancelados estão encerrados: não podem mais ser alterados nem receber comentários.
16. O momento em que o chamado é resolvido deve ficar registrado.
17. Um técnico não pode ter mais de **5 chamados** em atendimento ao mesmo tempo.
18. Ninguém pode atender o próprio chamado.

### **Sobre os comentários**

19. Só podem comentar em um chamado quem o abriu e o técnico responsável por ele.
20. Um comentário não pode ser vazio.
21. Comentários formam o histórico do chamado: uma vez escritos, não podem ser alterados nem apagados.

## **O que o sistema deve permitir**

* Cadastrar e manter pessoas e tipos de problema.
* Abrir chamados e consultá-los, com a possibilidade de filtrar por situação, prioridade, tipo de problema e técnico responsável.
* Ver um chamado com toda a sua conversa.
* Designar técnico, acompanhar o andamento do chamado e registrar comentários.
