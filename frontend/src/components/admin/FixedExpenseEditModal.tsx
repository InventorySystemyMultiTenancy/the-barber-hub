import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FixedExpense, UpdateFixedExpensePayload } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: FixedExpense | null;
  isSaving?: boolean;
  onSave: (payload: UpdateFixedExpensePayload) => Promise<void> | void;
};

function toInputDate(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function FixedExpenseEditModal({ open, onOpenChange, expense, isSaving = false, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expense) return;
    setTitle(expense.title ?? "");
    setAmount(String(expense.amount ?? ""));
    setStartsOn(toInputDate(expense.startsOn));
    setEndsOn(toInputDate(expense.endsOn));
    setIsActive(Boolean(expense.isActive));
    setNotes(expense.notes ?? "");
    setError(null);
  }, [expense]);

  const payload = useMemo<UpdateFixedExpensePayload>(() => {
    if (!expense) return {};

    const nextTitle = title.trim();
    const nextAmount = Number(amount);
    const nextStartsOn = startsOn;
    const nextEndsOn = endsOn.trim() ? endsOn : null;
    const nextNotes = notes.trim() ? notes.trim() : null;

    const out: UpdateFixedExpensePayload = {};

    if (nextTitle !== (expense.title ?? "")) out.title = nextTitle;
    if (!Number.isNaN(nextAmount) && nextAmount !== Number(expense.amount ?? 0)) out.amount = nextAmount;
    if (nextStartsOn !== toInputDate(expense.startsOn)) out.starts_on = nextStartsOn;
    if (nextEndsOn !== (toInputDate(expense.endsOn) || null)) out.ends_on = nextEndsOn;
    if (isActive !== Boolean(expense.isActive)) out.is_active = isActive;
    if (nextNotes !== ((expense.notes ?? "").trim() || null)) out.notes = nextNotes;

    return out;
  }, [amount, endsOn, expense, isActive, notes, startsOn, title]);

  const hasChanges = Object.keys(payload).length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nextTitle = title.trim();
    const nextAmount = Number(amount);

    if (!expense) {
      setError("Gasto fixo nao encontrado.");
      return;
    }

    if (!nextTitle) {
      setError("Informe o titulo.");
      return;
    }

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setError("Informe um valor valido maior que zero.");
      return;
    }

    if (!startsOn) {
      setError("Informe a data de inicio.");
      return;
    }

    if (!hasChanges) {
      setError("Nenhuma alteracao detectada.");
      return;
    }

    await onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar gasto fixo</DialogTitle>
          <DialogDescription>Atualize apenas os campos necessarios.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fixed-edit-title">Titulo</Label>
            <Input id="fixed-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixed-edit-amount">Valor (R$)</Label>
            <Input
              id="fixed-edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fixed-edit-starts-on">Inicio</Label>
              <Input
                id="fixed-edit-starts-on"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed-edit-ends-on">Fim (opcional)</Label>
              <Input
                id="fixed-edit-ends-on"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixed-edit-notes">Observacoes (opcional)</Label>
            <Textarea id="fixed-edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="fixed-edit-active">Ativo</Label>
            <Switch id="fixed-edit-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
