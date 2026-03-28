import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Marcas() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [editNome, setEditNome] = useState("");

  const { data: marcas, refetch } = trpc.marcas.list.useQuery();
  const createMutation = trpc.marcas.create.useMutation();
  const updateMutation = trpc.marcas.update.useMutation();
  const deleteMutation = trpc.marcas.delete.useMutation();

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }

    try {
      await createMutation.mutateAsync({ nome: nome.trim() });
      toast.success("Marca criada com sucesso!");
      setNome("");
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar marca");
    }
  };

  const openEditModal = (marca: { id: number; nome: string }) => {
    setEditId(marca.id);
    setEditNome(marca.nome);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editNome.trim() || !editId) {
      toast.error("Nome da marca é obrigatório");
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: editId, nome: editNome.trim() });
      toast.success("Marca atualizada com sucesso!");
      setShowEditModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar marca");
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente excluir a marca "${nome}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Marca excluída com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir marca");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Marcas</h1>
          <p className="text-muted-foreground mt-1">Cadastre e gerencie as marcas de produtos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Marca
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Marcas Cadastradas ({marcas?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marcas && marcas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marcas.map((marca) => (
                <div
                  key={marca.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{marca.nome}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(marca)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(marca.id, marca.nome)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma marca cadastrada. Clique em "Nova Marca" para adicionar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Marca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Marca</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: ORTOBOM, CASTOR, LAMOUR..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Marca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editNome">Nome da Marca</Label>
              <Input
                id="editNome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Ex: ORTOBOM, CASTOR, LAMOUR..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
