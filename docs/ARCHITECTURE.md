# Arquitetura em Camadas e Módulos

Este projeto foi reorganizado para suportar crescimento com separação rígida de responsabilidades.

## Camadas

- `presentation`
  - Controllers/routers (TRPC), validação de entrada e saída.
  - Não contém regra de negócio.
- `application`
  - Use cases e serviços de aplicação (orquestração).
- `domain`
  - Entidades e contratos (interfaces), regras centrais.
- `infrastructure`
  - Implementações concretas: DB/ORM, gateways de auditoria, integrações.
- `shared`
  - Erros, tipos e utilitários transversais.

## Módulos

- `server/modules/auth`
  - Login/logout, sessão local e políticas de tentativa.
- `server/modules/users`
  - Entidade e contrato de usuário + repositório concreto.
- `server/modules/approvals`
  - Aprovação, rejeição, promoção e inativação de usuários.
- `server/modules/audit`
  - Consulta/exportação de auditoria, mitigação de rate-limit e anomalias.

## Princípios aplicados

- MVC real: controller fino na `presentation`.
- SOLID: dependência por abstração (`IUserRepository`, `IAuditGateway`).
- Clean Code: módulos pequenos com responsabilidade única.
- Arquitetura em camadas: domínio sem depender de infra.

## Estratégia de migração segura

Foi mantida compatibilidade:
- `server/routers/authRouter.ts` virou camada compatível que reexporta a nova rota modular.
- Frontend manteve wrappers em `client/src/_core/*` apontando para `client/src/features/*`.

