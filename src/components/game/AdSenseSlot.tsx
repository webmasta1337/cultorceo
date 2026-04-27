import { useEffect } from "react";

const ADSENSE_CLIENT = "ca-pub-4078265599554177";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseSlotProps = {
  className?: string;
  style?: React.CSSProperties;
  format?: string;
};

export function AdSenseSlot({ className, style, format = "auto" }: AdSenseSlotProps) {
  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // AdSense can throw in preview, ad blockers, or before approval.
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}