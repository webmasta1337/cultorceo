import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdSenseSlot } from "./AdSenseSlot";

type AdInterstitialProps = {
  open: boolean;
  onDismiss: () => void;
};

export function AdInterstitial({ open, onDismiss }: AdInterstitialProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(5);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onDismiss();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, onDismiss]);

  if (!open) return null;

  const canSkip = secondsLeft <= 2;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-overlay px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Advertisement">
      <div className="w-full max-w-sm rounded-xl border border-ad-border bg-card p-5 text-center shadow-ritual animate-scale-in">
        <p className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-muted-foreground">Transmission break</p>
        <div className="mx-auto h-[250px] w-full max-w-[300px] overflow-hidden rounded-lg border border-ad-border bg-ad-panel">
          <AdSenseSlot style={{ width: 300, height: 250 }} format="rectangle" />
        </div>
        <p className="mt-4 font-ui text-sm text-muted-foreground">Game resumes in {secondsLeft}s</p>
        <Button className="mt-4 w-full" variant="chapel" disabled={!canSkip} onClick={onDismiss}>
          {canSkip ? "Skip Ad" : "Skip available soon"}
        </Button>
      </div>
    </div>
  );
}
