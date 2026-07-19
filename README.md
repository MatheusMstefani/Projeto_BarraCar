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

Neste ambiente, `npm` não está disponível no `PATH`. A pasta de migration contém somente um marcador: execute o comando de migration acima e versione o SQL gerado. Dependências, migration, seed, lint, typecheck, testes e build precisam ser executados com Node.js antes de considerar a etapa pronta para produção.
