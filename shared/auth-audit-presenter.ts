import { AUTH_AUDIT_ACTION } from "./auth-governance";

type AuditEventLike = {
  action: string;
  metadata?: Record<string, unknown> | null;
};

export function buildAuthAuditSummary(event: AuditEventLike, actorLabel: string) {
  if (event.action === AUTH_AUDIT_ACTION.APPROVE_USER) {
    return `O administrador ${actorLabel} aprovou um usuário pendente.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.REJECT_USER) {
    return `O administrador ${actorLabel} rejeitou um usuário pendente.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.RATE_LIMIT_CLEAR) {
    const removed = Number(event.metadata?.removed ?? 0);
    return `Foi executada uma mitigação operacional, removendo ${removed} bucket(s) de rate-limit.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.PROMOTE_USER_ADMIN) {
    return `O administrador ${actorLabel} promoveu um usuário para perfil admin.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.INACTIVATE_USER_TO_PENDING) {
    return `O administrador ${actorLabel} inativou o usuário, retornando para status pendente.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.LOGIN_SUCCESS) {
    return `Usuário ${actorLabel} autenticado com sucesso.`;
  }
  if (event.action === AUTH_AUDIT_ACTION.LOGIN_FAILED) {
    return "Houve falha de autenticação para o usuário informado.";
  }
  if (event.action === AUTH_AUDIT_ACTION.LOGIN_BLOCKED) {
    return "A origem foi bloqueada temporariamente por excesso de tentativas de login.";
  }

  return null;
}

