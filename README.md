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
