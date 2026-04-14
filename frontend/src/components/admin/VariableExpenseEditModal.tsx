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
import { Textarea } from "@/components/ui/textarea";
import type { UpdateVariableExpensePayload, VariableExpense } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: VariableExpense | null;
  isSaving?: boolean;
  onSave: (payload: UpdateVariableExpensePayload) => Promise<void> | void;
};

function toInputDate(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function VariableExpenseEditModal({ open, onOpenChange, expense, isSaving = false, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expense) return;
    setTitle(expense.title ?? "");
    setAmount(String(expense.amount ?? ""));
    setExpenseDate(toInputDate(expense.expenseDate));
    setNotes(expense.notes ?? "");
    setError(null);
  }, [expense]);

  const payload = useMemo<UpdateVariableExpensePayload>(() => {
    if (!expense) return {};

    const nextTitle = title.trim();
    const nextAmount = Number(amount);
    const nextExpenseDate = expenseDate;
    const nextNotes = notes.trim() ? notes.trim() : null;

    const out: UpdateVariableExpensePayload = {};

    if (nextTitle !== (expense.title ?? "")) out.title = nextTitle;
    if (!Number.isNaN(nextAmount) && nextAmount !== Number(expense.amount ?? 0)) out.amount = nextAmount;
    if (nextExpenseDate !== toInputDate(expense.expenseDate)) out.expense_date = nextExpenseDate;
    if (nextNotes !== ((expense.notes ?? "").trim() || null)) out.notes = nextNotes;

    return out;
  }, [amount, expense, expenseDate, notes, title]);

  const hasChanges = Object.keys(payload).length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nextTitle = title.trim();
    const nextAmount = Number(amount);

    if (!expense) {
      setError("Gasto variavel nao encontrado.");
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

    if (!expenseDate) {
      setError("Informe a data do gasto.");
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
          <DialogTitle>Editar gasto variavel</DialogTitle>
          <DialogDescription>Atualize apenas os campos necessarios.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="variable-edit-title">Titulo</Label>
            <Input id="variable-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variable-edit-amount">Valor (R$)</Label>
            <Input
              id="variable-edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variable-edit-date">Data</Label>
            <Input
              id="variable-edit-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variable-edit-notes">Observacoes (opcional)</Label>
            <Textarea id="variable-edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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
