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

## Histórico Geral

- Ordens são incluídas pelo instante de `entryAt` no fuso configurado.
- Financeiro é incluído pela data civil de `competenceDate`; apenas lançamentos `PAID` entram no saldo realizado e cancelados nunca entram nesse saldo.
- Agendamentos usam `startsAt`; clientes, veículos, fotos, assinaturas e PDFs usam `createdAt`.
- Intervalos usam início inclusivo e fim exclusivo para preservar corretamente o primeiro e o último dia no fuso `America/Sao_Paulo`.
- A visão anual sempre usa o intervalo de 1º de janeiro, inclusive, a 1º de janeiro do ano seguinte, exclusivo; ela depende do ano selecionado e não do mês atual.
- Cards mensais e linhas anuais compartilham a mesma agregação: todas as Ordens entram na quantidade; serviços contam apenas Ordens `FINISHED`, `AWAITING_PICKUP` ou `DELIVERED`; clientes e veículos são únicos entre Ordens não canceladas; entradas e saídas usam somente Financeiro `PAID`.
- A tabela e o gráfico anual usam a mesma coleção de 12 resultados do servidor. Busca e filtros são aplicados igualmente ao resumo mensal e ao ano, removendo apenas o recorte de mês.
- A busca geral encontra lançamentos financeiros tanto por seus próprios campos quanto pela OS relacionada, incluindo número, cliente, veículo, funcionário e serviço.
- Valores monetários dos indicadores são acumulados como `Decimal` e convertidos somente na saída, evitando diferenças de ponto flutuante entre o mensal e o anual.
- Exportações CSV neutralizam valores que poderiam ser interpretados como fórmulas por aplicativos de planilha.
- Valores históricos de serviços vêm de `WorkOrderItem.unitPrice`, nunca do preço padrão atual do catálogo.
- Funcionários inativos continuam nos resultados vinculados às Ordens antigas.
- A página e suas exportações são restritas a administradores; exportar não altera registros.
