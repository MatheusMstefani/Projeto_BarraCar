# ADR 0002 — Automações transacionais

Status: aceito.

Agenda, pagamento e auditoria são atualizados na mesma transação da OS. Restrições únicas (`workOrderId`) garantem idempotência mesmo sob repetição ou concorrência.
