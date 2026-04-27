import { useEffect, useState } from "react";

export const ENABLE_ADS = true;

export function useAdManager(currentStreak: number) {
  const [shownForStreak, setShownForStreak] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const shouldShow =
    ENABLE_ADS && currentStreak > 0 && currentStreak % 3 === 0 && currentStreak !== shownForStreak;

  useEffect(() => {
    if (shouldShow) {
      setShownForStreak(currentStreak);
      setShowInterstitial(true);
    }
  }, [currentStreak, shouldShow]);

  return {
    adsEnabled: ENABLE_ADS,
    showInterstitial,
    dismissInterstitial: () => setShowInterstitial(false),
  };
}
