import { AdsterraSlot } from "./AdsterraSlot";

type AdBannerProps = {
  roundKey: number;
  enabled: boolean;
};

export function AdBanner({ roundKey, enabled }: AdBannerProps) {
  if (!enabled) return null;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-ad-border bg-ad/95 px-3 py-3 shadow-ad backdrop-blur-xl" aria-label="Advertisement">
      <div className="mx-auto min-h-16 max-w-4xl overflow-hidden rounded-md border border-ad-border bg-ad-panel">
        <AdsterraSlot />
      </div>
    </aside>
  );
}
