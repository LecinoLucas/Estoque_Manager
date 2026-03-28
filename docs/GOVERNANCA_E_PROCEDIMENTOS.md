# Governança e Procedimentos Operacionais

## Objetivo
Este documento define os procedimentos mínimos de operação, segurança e rastreabilidade do sistema.

## Perfis e Responsabilidades
- `admin`: aprova/reprova usuários Google, gerencia regras críticas e auditoria.
- `gerente`: opera rotinas de negócio sem poder de governança de identidade.
- `user`: uso operacional padrão.

## Procedimentos de Acesso
1. Usuário solicita acesso via login Google.
2. Sistema registra como `google_pending`.
3. Admin analisa e decide:
   - Aprovar (`google`)
   - Reprovar (`google_rejected`)
4. Somente após aprovação o usuário recebe sessão válida.

## Procedimentos de Segurança
- Sessão assinada em cookie `httpOnly`.
- Rotação automática de sessão (sliding session).
- Expiração absoluta de sessão.
- Invalidação global por versionamento de sessão (`lastSignedIn`).
- Bloqueio temporário por tentativas excessivas de login.

## Trilha de Auditoria
- Eventos de segurança são gravados em `.dev-logs/audit.log` em formato JSONL.
- Eventos auditados incluem:
  - `auth.login_success`
  - `auth.login_failed`
  - `auth.login_blocked`
  - `auth.logout`
  - `auth.logout_all`
  - `auth.approve_user`
  - `auth.reject_user`

## Procedimento de Incidente
1. Identificar evento no `audit.log`.
2. Invalidar sessões (logout global).
3. Revisar aprovações recentes de usuários.
4. Atualizar `JWT_SECRET` se houver suspeita de comprometimento.
5. Documentar causa raiz e ação corretiva.

## Procedimento de Mudança
1. Alterações de autenticação/governança devem passar por revisão técnica.
2. Executar `pnpm -s tsc --noEmit` e testes relevantes antes de deploy.
3. Registrar impacto funcional e plano de rollback.

## Boas Práticas
- Não compartilhar `GOOGLE_CLIENT_SECRET` e `JWT_SECRET`.
- Não commitar `.env` com credenciais reais.
- Revisar usuários pendentes diariamente.
