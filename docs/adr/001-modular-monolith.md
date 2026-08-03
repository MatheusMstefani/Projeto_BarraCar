# ADR 001 — Monólito modular incremental

- **Status:** aceito
- **Data:** 2026-08-02

## Contexto

O Barracar Gestão é uma aplicação privada, single-tenant, para uma empresa pequena. O repositório Next.js já entrega UI, Server Actions, APIs, Prisma/PostgreSQL, MinIO, autenticação, PDFs e testes. Alguns fluxos possuem serviços de servidor bem definidos; outros ainda acessam Prisma diretamente.

Uma separação imediata por serviços aumentaria implantação, observabilidade, consistência distribuída e custo operacional sem resolver um gargalo comprovado.

## Decisão

Evoluir o mesmo repositório para um monólito modular incremental:

- `app/` permanece como UI e borda Next.js;
- novos/migrados módulos vivem em `server/modules/<module>`;
- cada módulo expõe somente `public.ts`;
- internamente, a direção é `domain <- application <- adapters`;
- infraestrutura comum fica em `server/platform`;
- migração acontece por fatias verticais, começando por um piloto;
- código legado funcional pode coexistir até ser tocado.

## Consequências positivas

- transações locais e implantação simples são preservadas;
- limites e propriedade de regras ficam explícitos;
- testes de domínio/aplicação ficam mais fáceis;
- futuras extrações, se algum dia necessárias, partem de limites reais;
- o risco de uma reescrita é evitado.

## Consequências e cuidados

- haverá período híbrido com arquivos antigos e módulos novos;
- revisões devem impedir importações internas entre módulos;
- não criar pastas vazias ou abstrações genéricas;
- documentação deve acompanhar a migração;
- Ordens exige atenção por coordenar várias responsabilidades.

## Alternativas rejeitadas

- manter organização totalmente por páginas: simples hoje, mas amplia duplicação e acoplamento;
- reescrever tudo antes de novas entregas: risco e tempo desproporcionais;
- microserviços: não há escala, equipe ou isolamento operacional que os justifique.

## Critério de revisão

Reavaliar apenas com evidência persistente de necessidade de implantação/escala independente, fronteira de equipe clara ou requisito de isolamento que o monólito não consiga atender.
