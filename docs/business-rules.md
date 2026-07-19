# Regras de negócio

- Placas são normalizadas em maiúsculas e sem caracteres não alfanuméricos, e são únicas.
- Uma OS tem número sequencial legível.
- Uma OS agendada possui no máximo um agendamento, atualizado quando a data muda.
- Cancelar a OS cancela seu agendamento.
- Marcar a OS como paga cria exatamente uma entrada financeira vinculada.
- Reverter pagamento cancela a entrada anterior; nunca a apaga.
- Operações compostas e auditoria usam a mesma transação.
- ADMIN gerencia tudo; EMPLOYEE acessa dashboard e execução autorizada.
- Abrir o checklist materializa itens ativos uma única vez por OS e permite preenchimento parcial.
- JPG, PNG e WEBP são aceitos somente após validação do MIME real; o limite padrão é 10 MB.
- Fotos de entrada e avaria ficam protegidas após finalização; correção administrativa exige motivo e auditoria.
- O bucket é privado e binários só são servidos por rotas autenticadas.
- Cada geração de PDF cria uma versão; visualizar ou baixar não cria outra.
- Alterar a OS marca o documento atual como desatualizado sem apagar versões.
