import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function PendingUsers() {
  const { user: currentUser } = useAuth();
  const pendingQuery = trpc.auth.pendingUsers.useQuery();
  const usersQuery = trpc.auth.usersAdminList.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.auth.approveUser.useMutation({
    onSuccess: async () => {
      toast.success("Usuário aprovado com sucesso.");
      await utils.auth.pendingUsers.invalidate();
      await utils.auth.usersAdminList.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao aprovar usuário.");
    },
  });

  const rejectMutation = trpc.auth.rejectUser.useMutation({
    onSuccess: async () => {
      toast.success("Usuário recusado com sucesso.");
      await utils.auth.pendingUsers.invalidate();
      await utils.auth.usersAdminList.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao recusar usuário.");
    },
  });

  const promoteMutation = trpc.auth.promoteUserToAdmin.useMutation({
    onSuccess: async (data) => {
      if (data.alreadyAdmin) {
        toast.info("Usuário já era administrador.");
      } else {
        toast.success("Usuário promovido para administrador.");
      }
      await utils.auth.usersAdminList.invalidate();
      await utils.auth.pendingUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao promover usuário.");
    },
  });

  const inactivateMutation = trpc.auth.inactivateUserToPending.useMutation({
    onSuccess: async () => {
      toast.success("Usuário inativado e retornado para pendente.");
      await utils.auth.usersAdminList.invalidate();
      await utils.auth.pendingUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao inativar usuário.");
    },
  });

  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    promoteMutation.isPending ||
    inactivateMutation.isPending;

  const statusBadge = (status: "active" | "pending" | "rejected") => {
    if (status === "active") return <Badge variant="default">Ativo</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejeitado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aprovação de Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Aprove ou recuse usuários novos que entraram pelo Google.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Usuários Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando...</div>
          ) : !pendingQuery.data || pendingQuery.data.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum usuário pendente no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuery.data.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium">{user.name || "Usuário sem nome"}</div>
                    <div className="text-sm text-muted-foreground">{user.email || "Sem email"}</div>
                    <div className="mt-2">
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({ userId: user.id })}
                      disabled={isBusy}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ userId: user.id })}
                      disabled={isBusy}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando usuários...</div>
          ) : !usersQuery.data || usersQuery.data.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {usersQuery.data.map((user) => {
                const isSelf = currentUser?.id === user.id;
                const canPromote = user.role !== "admin" && user.status === "active" && !isSelf;
                const canInactivate = !isSelf && user.status !== "pending";
                return (
                  <div
                    key={`managed-${user.id}`}
                    className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium">{user.name || "Usuário sem nome"}</div>
                      <div className="text-sm text-muted-foreground">{user.email || "Sem email"}</div>
                      <div className="mt-2 flex items-center gap-2">
                        {statusBadge(user.status)}
                        <Badge variant="outline">{user.role}</Badge>
                        {isSelf ? <Badge variant="secondary">Você</Badge> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => promoteMutation.mutate({ userId: user.id })}
                        disabled={isBusy || !canPromote}
                      >
                        Promover a Admin
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => inactivateMutation.mutate({ userId: user.id })}
                        disabled={isBusy || !canInactivate}
                      >
                        Inativar (voltar pendente)
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
