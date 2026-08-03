# ADR 003 — Jobs em segundo plano somente quando necessários

- **Status:** aceito
- **Data:** 2026-08-02

## Contexto

Uploads, thumbnails e PDFs são executados de forma síncrona hoje, com transações, locks e compensações. Não existe evidência de fila acumulada, múltiplas réplicas ou provedor externo que exija retentativa durável. Adicionar Redis/BullMQ e worker aumentaria componentes, deploy, monitoramento e modos de falha.

## Decisão

Não adicionar worker, Redis ou fila neste momento. Considerar job durável quando houver pelo menos um sinal:

- operação lenta recorrente que prejudica a requisição;
- necessidade de retentativa após reinício;
- agendamento;
- dependência externa instável;
- consumo de CPU/memória que afeta o servidor web;
- concorrência/deduplicação que precisa sobreviver ao processo.

O primeiro mecanismo preferido será uma tabela PostgreSQL e executor no mesmo código-base, com:

```text
id, type, payloadVersion, payload, status, attempts, maxAttempts,
runAfter, lockedAt, lockedBy, operationId, lastErrorCode,
createdAt, updatedAt, completedAt
```

Jobs devem ser idempotentes, ter payload versionado, timeout, backoff e erro sanitizado. Auditoria de negócio continua separada.

## Primeiros candidatos condicionais

- geração de PDF muito grande;
- reconciliação de objetos órfãos;
- lembretes de pós-venda;
- envio de notificações;
- processamento pesado de imagens.

Ser candidato não significa implementação automática.

## Consequências positivas

- operação permanece simples;
- não há nova dependência obrigatória;
- o desenho futuro está preparado sem antecipar custo.

## Consequências e cuidados

- operações síncronas precisam manter limites e timeouts;
- falhas parciais de storage continuam exigindo compensação;
- métricas de duração/erro são necessárias para decidir com evidência;
- uma tabela de job demanda processo de polling e recuperação de locks.

## Alternativas rejeitadas agora

- Redis/BullMQ obrigatório desde o início;
- Kafka ou broker distribuído;
- executar tarefas sem persistência via `setTimeout` após responder;
- cron externo sem idempotência.

## Critério de revisão

Revisar quando métricas ou incidentes atingirem um dos sinais acima. Só migrar para fila externa se a solução PostgreSQL se tornar insuficiente.
