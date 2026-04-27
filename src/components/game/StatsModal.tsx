import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameStats = {
  streak: number;
  bestStreak: number;
  totalGuesses: number;
  totalCorrect: number;
};

type StatsModalProps = {
  open: boolean;
  stats: GameStats;
  onClose: () => void;
};

export function StatsModal({ open, stats, onClose }: StatsModalProps) {
  if (!open) return null;

  const accuracy = stats.totalGuesses ? Math.round((stats.totalCorrect / stats.totalGuesses) * 100) : 0;
  const statItems = [
    ["Current streak", stats.streak],
    ["Best streak", stats.bestStreak],
    ["Total correct", stats.totalCorrect],
    ["Accuracy", `${accuracy}%`],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Game statistics">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-ritual animate-scale-in">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-ui text-xs uppercase tracking-[0.28em] text-muted-foreground">The ledger</p>
            <h2 className="font-serif text-3xl font-bold text-foreground">Your discernment</h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close stats">
            <X />
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {statItems.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-secondary p-4">
              <p className="font-ui text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
              <p className="mt-2 font-serif text-3xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
