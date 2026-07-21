# Barracar Gestão

Base operacional responsiva da Barracar Estética Automotiva, construída com Next.js, TypeScript, Prisma e PostgreSQL.

## Requisitos e instalação

- Node.js 22 LTS e npm 10+
- Docker com Compose

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name initial
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`. O MinIO fica em `http://localhost:9001`.

## Credenciais exclusivamente locais

- Login: `admin` ou `admin@barracar.local`
- Senha: `Barracar@123`

Troque a senha e o `AUTH_SECRET` fora do ambiente local. Nenhuma credencial de produção está versionada.

## Ambiente e banco

Copie `.env.example`. `DATABASE_URL` conecta o Prisma; `AUTH_SECRET` assina sessões; `S3_*` prepara o armazenamento privado; `APP_TIMEZONE` começa em `America/Sao_Paulo`. O seed idempotente cria o administrador, configurações e os 42 serviços iniciais.

```bash
npx prisma studio
npm run lint
npm run typecheck
npm test
npm run build
```

## Roteiro de revisão operacional

- **Funcionários:** cadastre, edite, inative e confirme que somente ativos aparecem em uma nova OS. Ordens antigas devem continuar mostrando o responsável inativado.
- **Serviços:** altere preço, duração e status; confirme que o novo preço aparece em novas OS e que itens antigos preservam o valor contratado.
- **Financeiro:** crie uma entrada e uma saída, marque-as como pagas e confira o saldo. Pendentes e canceladas não entram nos cartões de totais. Lançamentos de OS exibem seu número; manuais exibem “Manual”.
- **Ordem de Serviço:** adicione vários serviços, quantidades, preços e responsáveis diferentes; remova um item e confira contador/total. Salve, recarregue e confirme persistência. O serviço transacional também cobre edição sem duplicação.
- **Agenda e pagamento:** uma OS agendada mantém um único agendamento mesmo após edição. Remover a data cancela o agendamento existente. Repetir “Marcar paga” mantém uma única entrada financeira.

Na revisão de 19/07/2026, Prisma Validate, TypeScript, testes e build passaram. O ESLint permaneceu sem erros; os avisos de `<img>` referem-se a imagens servidas por rotas autenticadas e prévias locais `blob:`, para as quais o otimizador do Next não recebe a sessão do usuário.

## Estrutura

- `app/`: páginas e Server Actions
- `components/`: interface reutilizável
- `server/services/`: regras transacionais
- `lib/`: banco, autenticação e utilitários
- `prisma/`: modelo, migrations e seed
- `docs/`: requisitos, arquitetura, decisões e roadmap

## Estado de validação

Node.js, dependências e Docker estão disponíveis. As migrations inicial e da Fase 2 foram aplicadas sem reset; seed, typecheck, lint, testes e build foram executados com sucesso em 19/07/2026.

## Fase 2 — checklist, fotos, assinaturas e PDF

Execute `docker compose up -d` para iniciar PostgreSQL, MinIO e criar automaticamente o bucket privado. A variável `MAX_IMAGE_SIZE_MB` controla o limite de imagem (10 MB por padrão).

Para testar:

1. Entre como administrador e crie ou abra uma OS.
2. Clique no número da OS e use as abas Checklist, Vistoria e fotos, Assinaturas e Documento PDF.
3. No Checklist, salve itens individualmente e confirme o contador de progresso.
4. Em Vistoria, escolha câmera/galeria, confira a prévia e envie JPG, PNG ou WEBP.
5. Em Assinaturas, desenhe com mouse ou toque, informe o assinante e confirme.
6. Em Documento PDF, gere, visualize, baixe e gere uma nova versão.
7. Em Histórico, confirme os eventos auditados.

O MinIO está em `http://localhost:9001` com as credenciais locais do `.env.example`. O bucket `barracar-private` deve aparecer sem acesso anônimo. Para testar pelo celular, use o IP local do computador e permita acesso à câmera no navegador.

```bash
npx prisma migrate deploy
npm run db:seed
npm run typecheck
npm run lint
npm test
npm run build
```

### Vistoria fotográfica completa

- Cada envio aceita até 10 originais JPG, PNG ou WEBP; `MAX_PHOTO_SIZE_MB` define o limite individual e mantém compatibilidade com `MAX_IMAGE_SIZE_MB`.
- O original privado é preservado e uma miniatura WEBP é criada. MIME real, SHA-256, dimensões, autor, data, categoria e região são registrados.
- Fotos podem ser vinculadas a checklist e serviço. A galeria permite filtros, edição auditada, exclusão lógica e download do original.
- Evidências de entrada e avaria em OS finalizada, aguardando retirada ou entregue exigem administrador e motivo para alteração ou exclusão.
- Mudanças nas fotos tornam o PDF atual desatualizado; a próxima geração cria uma versão imutável com fotos, vínculos, avarias, assinaturas e identificação de integridade.

No teste manual, abra uma OS e a aba **Vistoria e fotos**. Envie categorias diferentes, relacione checklist/serviço, filtre, abra o original, edite a descrição e gere duas versões do PDF. Depois finalize a OS e confirme a proteção das evidências. No celular, permita a câmera; fora de `localhost`, o navegador normalmente exige HTTPS.

## Revisão de robustez — 20/07/2026

- A edição de uma OS reconcilia seus itens em vez de recriá-los, preservando execução, observações e vínculos das fotos.
- Valores de OS são calculados em centavos; datas financeiras são tratadas como datas civis, sem deslocamento de fuso.
- Totais financeiros usam todos os lançamentos pagos. Lançamentos automáticos são controlados exclusivamente pela OS.
- O upload aceita o lote anunciado, valida enums no servidor, limpa o formulário ao concluir e remove objetos novos quando a persistência falha.
- A geração de PDF é serializada por OS para garantir versões únicas em requisições concorrentes.
- Sessões são revalidadas contra o usuário ativo e a função atual; login possui limitação local de tentativas e comparação de senha com tempo uniforme.
- Em produção, as credenciais `S3_ACCESS_KEY` e `S3_SECRET_KEY` são obrigatórias. `AUTH_SESSION_MAX_AGE_SECONDS` permite ajustar a duração da sessão, com padrão de 8 horas.

Decisões conscientes: o rate limiting atual é por processo e deve migrar para Redis em múltiplas réplicas. Como o sistema interno não possui escopo por equipe/filial, usuários ativos autenticados compartilham acesso às mídias das OS; os objetos continuam privados e são entregues somente por rotas autenticadas.
