# Matriz de segurança

## Premissas

- A aplicação é single-tenant e de uso interno.
- `ADMIN` gerencia o negócio.
- `EMPLOYEE` executa atividades operacionais autorizadas.
- Visitante sem sessão acessa apenas login e assets públicos.
- Cliente externo é um ator futuro e não possui acesso no sistema atual.
- Toda permissão é revalidada no servidor; visibilidade de menu não autoriza uma ação.

Legenda: **A** permitido; **C** condicionado à regra do recurso; **N** negado; **F** futuro/não implementado.

## Ator × recurso × ação

| Recurso | Ação | ADMIN | EMPLOYEE | Visitante | Cliente externo futuro | Capacidade alvo |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| Clientes | listar/consultar | A | A | N | F | `customers:read` |
| Clientes | criar/alterar | A | N | N | F | `customers:manage` |
| Veículos | listar/consultar | A | A | N | F | `vehicles:read` |
| Veículos | criar/alterar | A | N | N | F | `vehicles:manage` |
| Funcionários | listar/consultar | A | N | N | N | `employees:read` |
| Funcionários | criar/alterar/ativar | A | N | N | N | `employees:manage` |
| Serviços | listar/consultar | A | A | N | F | `services:read` |
| Serviços | criar/alterar/preço | A | N | N | N | `services:manage` |
| Ordens | listar/consultar | A | A | N | F | `work-orders:read` |
| Ordens | criar/alterar itens, preço e status | A | N no fluxo atual | N | F | `work-orders:manage` |
| Ordens | registrar execução/checklist | A | A | N | F | `work-orders:execute` |
| Ordens | pagar/reverter pagamento | A | N | N | N | `work-orders:manage-payment` |
| Agenda | listar | A | A | N | F | `appointments:read` |
| Agenda | alterar manualmente | A | N no fluxo atual | N | F | `appointments:manage` |
| Financeiro | listar/exportar | A | N | N | N | `finance:read` |
| Financeiro | criar/alterar | A | N | N | N | `finance:manage` |
| Fotos de vistoria | listar/baixar | A | A | N | F | `inspections:read` |
| Fotos de vistoria | enviar/descrever | A | C, conforme OS | N | F | `inspections:collect` |
| Fotos de vistoria | alterar/remover evidência bloqueada | C, com motivo | N | N | N | `inspections:override-locked` |
| Assinaturas | listar/baixar | A | A | N | F | `documents:read` |
| Assinaturas | coletar/substituir | A | C, conforme OS | N | F | `signatures:collect` |
| PDFs | gerar | A | C, conforme OS | N | F | `documents:generate` |
| PDFs | visualizar/baixar | A | A | N | F, somente o próprio | `documents:read` |
| Histórico | consultar | A | N | N | N | `history:read` |
| Histórico | exportar CSV/PDF | A | N | N | N | `history:export` |
| Configurações | consultar/alterar | A | N | N | N | `settings:manage` |
| Usuários | gerenciar papel/estado | A | N | N | N | `users:manage` |

## Estado atual observado

- páginas administrativas usam `requireAdminPage` em Financeiro, Funcionários, Histórico e Configurações;
- Server Actions críticas repetem a checagem `role === "ADMIN"`;
- Auth.js revalida usuário ativo e papel no banco em requisições protegidas;
- middleware exige sessão, mas não substitui autorização de negócio;
- ações de checklist, foto, assinatura e PDF aceitam usuários autenticados e aplicam regras do recurso nos serviços;
- APIs privadas de fotos, assinaturas e documentos atualmente permitem leitura a qualquer usuário interno autenticado. Isso corresponde ao escopo single-tenant documentado, porém é uma política ampla e deve virar capacidade explícita;
- exportação de Histórico revalida `ADMIN` no Route Handler;
- nenhuma rota de cliente externo existe.

## Regras por recurso

### Identificadores e acesso a objeto

- IDs recebidos nunca provam autorização;
- carregar somente projeção necessária e aplicar a política antes de obter bytes;
- responder de forma consistente para recurso inexistente/não visível quando a distinção revelar informação;
- não aceitar `userId`, `role`, `workOrderId` ou chaves de objeto como campos livremente atualizáveis;
- chaves MinIO nunca são retornadas como autorização.

### Mass assignment

- cada comando usa schema explícito Zod;
- `Object.fromEntries(formData)` só pode alimentar schemas que descartem/rejeitem campos não previstos conforme o risco;
- papel, estado de pagamento, totais, auditoria, ator e vínculos automáticos são definidos no servidor;
- entidades financeiras originadas por OS só mudam pelo caso de uso de OS.

### Uploads

- no máximo 10 fotos por lote e limite individual configurado;
- MIME real por assinatura; JPEG/PNG/WebP; SVG negado;
- chave aleatória do sistema;
- checksum SHA-256 e metadados persistidos;
- nome original tratado apenas como metadado/filename sanitizado;
- bucket privado, resposta `nosniff`, cache privado;
- falha parcial é reportada e galeria revalidada; compensação remove objeto quando persistência falha.

### Sessão e login

- mensagens não distinguem usuário inexistente de senha incorreta;
- bcrypt falso reduz diferença de tempo;
- rate limit por identificador e IP é adequado para uma instância;
- cookies/sessão seguem Auth.js e segredo obrigatório em produção;
- ao escalar horizontalmente, rate limit deve se tornar compartilhado antes de adicionar réplicas.

## Testes negativos obrigatórios

### BOLA/IDOR

- usuário autenticado fornece ID inexistente de foto, assinatura, PDF e OS;
- `EMPLOYEE` tenta acessar histórico/financeiro por URL direta;
- ator sem capacidade tenta baixar objeto mesmo conhecendo o ID;
- foto logicamente removida não é retornada;
- item de checklist/foto de outra OS não pode ser associado por ID manipulado.

### BFLA e privilégios

- `EMPLOYEE` chama Server Action de criar cliente/veículo/serviço/funcionário;
- `EMPLOYEE` chama diretamente pagar/reverter OS;
- cliente futuro tenta rota interna ou documento de outro cliente;
- alteração do papel no token antigo não prevalece sobre revalidação no banco;
- usuário inativo perde acesso.

### Mass assignment e validação

- enviar campos extras `role`, `total`, `paymentStatus`, `userId`, `objectKey`, `deletedAt`;
- trocar `customerId`/`vehicleId` por combinação incompatível;
- valores negativos, quantidade zero, data inválida e enum desconhecido;
- alterar lançamento automático por ação financeira manual.

### Upload e mídia

- extensão `.jpg` com bytes de outro tipo;
- SVG, arquivo vazio, tamanho acima do limite e 11 arquivos;
- conteúdo corrompido para `sharp`;
- download sem sessão;
- edição/remoção de evidência após bloqueio sem ADMIN e sem justificativa;
- falha do MinIO, falha do banco e objeto duplicado;
- headers não permitem sniffing ou cache público.

### Repetição e concorrência

- duplo clique em pagamento cria um único lançamento;
- duas sincronizações geram um único compromisso;
- duas gerações simultâneas de PDF produzem versões únicas e uma versão atual;
- assinatura repetida substitui os bytes e o nome de modo consistente;
- reenvio de upload, notificação e lembrete futuro usa `operationId`/chave única.

### Login, sessão e vazamento

- brute force por usuário e por IP;
- sessão expirada, usuário desativado e papel alterado;
- logs não contêm senha, hash, cookie, token, bytes, URL assinada, SQL ou stack em resposta;
- erros desconhecidos retornam mensagem segura e `requestId`;
- tempo de resposta de usuário inexistente e senha errada não diverge de forma grosseira.

## Cobertura mínima por camada

| Camada | Evidência esperada |
| --- | --- |
| Domain/application | decisão de capacidade, invariantes e idempotência |
| Prisma/MinIO adapters | restrições, transação, compensação e contrato real de storage |
| Server Actions | Zod, ator revalidado, fields seguros e mass assignment |
| Route Handlers | 401/403/404, headers, política de recurso e Problem Details |
| Playwright | navegação por papel e fluxos críticos visíveis |

## Evolução para cliente externo

Não reutilizar a política ampla de “usuário interno autenticado”. Antes de criar portal externo:

1. definir vínculo verificável entre identidade externa e cliente;
2. limitar cada consulta ao próprio cliente/recurso;
3. adicionar capacidades separadas, expiração e auditoria;
4. executar todos os testes BOLA/BFLA;
5. revisar retenção, consentimento e exposição de fotos/documentos.

Isso não exige multi-tenancy nem RLS multiempresa; exige autorização por proprietário no novo canal.
