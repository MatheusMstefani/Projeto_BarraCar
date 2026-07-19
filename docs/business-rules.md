# Regras de negócio

- Placas são normalizadas em maiúsculas e sem caracteres não alfanuméricos, e são únicas.
- Uma OS tem número sequencial legível.
- Uma OS agendada possui no máximo um agendamento, atualizado quando a data muda.
- Cancelar a OS cancela seu agendamento.
- Marcar a OS como paga cria exatamente uma entrada financeira vinculada.
- Reverter pagamento cancela a entrada anterior; nunca a apaga.
- Operações compostas e auditoria usam a mesma transação.
- ADMIN gerencia tudo; EMPLOYEE acessa dashboard e execução autorizada.
