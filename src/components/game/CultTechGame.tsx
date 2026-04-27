import { useEffect, useMemo, useState } from "react";
import { Clipboard, Home, Rocket, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { headshotPreloadSources, quoteHeadshots, quotes, type GameQuote, type QuoteSource } from "@/data/quotes";
import { useAdManager } from "@/hooks/useAdManager";
import { AdInterstitial } from "./AdInterstitial";
import { type GameStats, StatsModal } from "./StatsModal";

const STORAGE_KEY = "cult-or-tech-stats";
const DAILY_KEY_PREFIX = "cult-or-tech-daily";

const defaultStats: GameStats = {
  streak: 0,
  bestStreak: 0,
  totalGuesses: 0,
  totalCorrect: 0,
};

type RoundResult = {
  guess: QuoteSource;
  isCorrect: boolean;
};

const vibeSlides = [
  {
    label: "TEST YOUR INTUITION",
    quote: "Individual freedom matters less than the collective mission.",
    action: "CULT OR CEO?"
  },
  {
    label: "VISIONARY OR VILLAIN?",
    quote: "Humanity must escape its single point of failure.",
    action: "WHO SAID IT?"
  },
  {
    label: "THE ASCENSION BEGINS",
    quote: "You have been lied to about what is possible. We are here to show you the truth.",
    action: "READY TO PLAY?"
  },
];

function sourceLabel(source: QuoteSource) {
  return source === "cult_leader" ? "Cult Leader" : "CEO";
}

function todayKey() {
  return `${DAILY_KEY_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
}

function dailySeed() {
  return Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function orderQuotesForToday(list: GameQuote[]) {
  const shuffled = [...list]
    .map((quote) => ({ quote, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ quote }) => quote);

  return shuffled.reduce<GameQuote[]>((ordered, quote) => {
    const last = ordered.at(-1);
    if (!last || last.source !== quote.source) return [...ordered, quote];

    const insertAt = ordered.findIndex((item, index) => item.source !== quote.source && ordered[index - 1]?.source !== quote.source);
    if (insertAt <= 0) return [...ordered, quote];

    return [...ordered.slice(0, insertAt), quote, ...ordered.slice(insertAt)];
  }, []);
}

export function CultTechGame() {
  const [started, setStarted] = useState(false);
  const [quoteOrder, setQuoteOrder] = useState<GameQuote[]>(orderQuotesForToday(quotes));
  const [roundIndex, setRoundIndex] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [dailyGuesses, setDailyGuesses] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("Share score");
  const [streakPopup, setStreakPopup] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showDamage, setShowDamage] = useState(false);
  const adManager = useAdManager(stats.streak);

  const currentQuote = quoteOrder[roundIndex % quoteOrder.length];
  const currentHeadshot = quoteHeadshots[currentQuote.id];
  const accuracy = stats.totalGuesses ? Math.round((stats.totalCorrect / stats.totalGuesses) * 100) : 0;
  const progressDots = useMemo(() => quoteOrder.slice(0, 10), [quoteOrder]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setStats({ ...defaultStats, ...JSON.parse(saved) });
    }
    setDailyGuesses(Number(window.localStorage.getItem(todayKey()) ?? 0));

    headshotPreloadSources.forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = src;
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  function startGame() {
    setQuoteOrder(orderQuotesForToday(quotes));
    setRoundIndex(0);
    setResult(null);
    setStarted(true);
    setStrikes(0);
    setGameOver(false);
    setShareStatus("Share score");
  }

  function answer(guess: QuoteSource) {
    if (result || gameOver) return;

    const isCorrect = guess === currentQuote.source;
    setResult({ guess, isCorrect });
    setStats((current) => {
      const nextStreak = isCorrect ? current.streak + 1 : 0;
      if (nextStreak >= 3) {
        setStreakPopup(nextStreak);
      } else if (!isCorrect) {
        setStreakPopup(0);
      }
      return {
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        totalGuesses: current.totalGuesses + 1,
        totalCorrect: current.totalCorrect + (isCorrect ? 1 : 0),
      };
    });

    const nextDaily = dailyGuesses + 1;
    setDailyGuesses(nextDaily);
    window.localStorage.setItem(todayKey(), String(nextDaily));

    if (!isCorrect) {
      setShowDamage(true);
      setTimeout(() => setShowDamage(false), 400);

      setStrikes((s) => {
        const nextStrikes = s + 1;
        if (nextStrikes >= 3) {
          setGameOver(true);
        }
        return nextStrikes;
      });
    }
  }

  function nextRound() {
    setRoundIndex((current) => (current + 1) % quoteOrder.length);
    setResult(null);
    setShareStatus("Share score");
  }

  async function shareScore() {
    const message = gameOver 
      ? `I survived ${roundIndex} rounds of Cult or CEO before getting fired/excommunicated. Think you can beat me? ${window.location.href}`
      : `I can tell a cult leader from a CEO ${accuracy}% of the time. The confusion is terrifying. Can you beat me? ${window.location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cult or CEO?", text: message });
      } else {
        await navigator.clipboard.writeText(message);
        setShareStatus("Copied");
      }
    } catch {
      await navigator.clipboard.writeText(message);
      setShareStatus("Share score");
    }
  }

  const answerClass = result?.isCorrect ? "answer-correct" : result ? "answer-wrong" : "";
  const badgeClass = currentQuote.source === "cult_leader" ? "bg-cult text-cult-foreground shadow-cult" : "bg-tech text-tech-foreground shadow-tech";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-12 text-foreground">
      {showDamage && <div className="pointer-events-none fixed inset-0 z-50 bg-red-600/20 mix-blend-color-burn" style={{ animation: 'chapel-pulse 300ms ease' }} />}
      <div className="chapel-particles" aria-hidden="true" />
      {streakPopup >= 3 && (
        <aside className="streak-toast" aria-live="polite">
          <span className="streak-toast__label">Streak</span>
          <strong>{streakPopup} correct</strong>
        </aside>
      )}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 border-b border-border py-3">
          <div className="flex items-center gap-2 min-w-0">
            {started && (
              <Button size="icon" variant="ghost" onClick={() => setStarted(false)} aria-label="Go home">
                <Home className="h-4 w-4" />
              </Button>
            )}
            <p className="min-w-0 truncate font-ui text-sm font-bold text-foreground">Cult or CEO?</p>
          </div>
          <Button className="shrink-0" size="icon" variant="ghost" onClick={() => setStatsOpen(true)} aria-label="Open stats">
            <Trophy />
          </Button>
        </header>

        {!started ? (
          <section className="flex flex-1 flex-col items-center justify-center py-10 text-center animate-fade-in">
            <div className="mb-12 flex flex-col items-center">
              <h1 className="max-w-4xl font-serif text-6xl font-black leading-none text-foreground sm:text-8xl lg:text-9xl">
                CULT<span className="text-primary">OR</span>CEO
              </h1>
              <p className="mt-4 font-ui text-xs font-bold uppercase tracking-[0.4em] text-primary/60">The definitive intuition test</p>
            </div>
            
            <div className="relative mb-16 w-full max-w-2xl px-4">
              <div className="absolute -left-4 -top-8 font-serif text-8xl opacity-10 text-primary">“</div>
              <p className="font-serif text-2xl font-black leading-tight text-foreground sm:text-4xl italic">
                {vibeSlides[0].quote}
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-4">
              <Button className="h-20 w-full rounded-full bg-primary text-xl font-black uppercase tracking-widest text-primary-foreground shadow-ritual transition-transform hover:scale-105 active:scale-95" onClick={startGame}>
                Play Game
              </Button>
              <button onClick={() => setStatsOpen(true)} className="font-ui text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                View Lifetime Stats
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8 animate-fade-in">
            <h1 className="sr-only">Cult or CEO? Gameplay</h1>
            <div className="mb-8 flex items-center justify-between gap-3 font-ui text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              <span>Streak {stats.streak}</span>
              <div className="flex gap-2 items-center">
                <span>Strikes</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-2 w-2 rounded-full border ${i <= strikes ? "bg-red-500 border-red-500 shadow-[0_0_10px_oklch(0.62_0.24_25)]" : "border-muted opacity-30"}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-10 gap-1.5" aria-label="Round progress">
              {progressDots.map((quote, index) => (
                <span key={quote.id} className={`h-1.5 rounded-full ${index === roundIndex % 10 ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <article className={`quote-card min-h-[40vh] flex flex-col justify-center items-center ${answerClass}`}>
              {result?.isCorrect && (
                <div className="correct-burst" aria-live="polite">
                  <span>Correct</span>
                </div>
              )}
              <blockquote className="font-serif text-4xl font-black leading-tight text-foreground sm:text-6xl lg:text-7xl italic">
                “{currentQuote.quote}”
              </blockquote>
            </article>

            {!result ? (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                <Button className="h-24 text-xl font-black uppercase tracking-widest rounded-2xl bg-white text-black hover:bg-white/90 transition-all active:scale-95" onClick={() => answer("cult_leader")}>
                  Cult Leader
                </Button>
                <Button className="h-24 text-xl font-black uppercase tracking-widest rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95" onClick={() => answer("ceo")}>
                  CEO
                </Button>
              </div>
            ) : (
              <div className="mt-12 flex flex-col items-center animate-glitch-in text-center">
                <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:text-left">
                  <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-primary shadow-ritual">
                    <img src={quoteHeadshots[currentQuote.id].src} alt={quoteHeadshots[currentQuote.id].alt} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className={`font-ui text-[10px] font-bold uppercase tracking-[0.4em] ${result.isCorrect ? "text-correct" : "text-red-500"}`}>
                      {result.isCorrect ? "Direct Hit" : "System Failure"}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-black text-foreground sm:text-4xl">{currentQuote.attribution}</h2>
                  </div>
                </div>
                
                <p className="max-w-xl font-ui text-sm leading-relaxed text-muted-foreground/80">
                  {currentQuote.reveal}
                </p>

                <div className="mt-12 flex w-full max-w-sm flex-col gap-4">
                  {!gameOver ? (
                    <Button className="h-20 w-full rounded-full bg-primary text-xl font-black uppercase tracking-widest text-primary-foreground shadow-ritual transition-transform hover:scale-105 active:scale-95" onClick={nextRound}>
                      Next Round
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <h2 className="font-serif text-4xl font-black text-red-500 animate-pulse">GAME OVER</h2>
                      <p className="font-ui text-xs font-bold uppercase tracking-widest text-muted-foreground">You survived {roundIndex} rounds</p>
                      <Button className="h-20 w-full rounded-full bg-red-600 text-xl font-black uppercase tracking-widest text-white shadow-ritual" onClick={startGame}>
                        Try Again
                      </Button>
                    </div>
                  )}
                  <button onClick={shareScore} className="flex items-center justify-center gap-2 font-ui text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    {shareStatus === "Copied" ? <Clipboard className="h-3 w-3" /> : <Share2 className="h-3 w-3" />} {shareStatus}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <StatsModal open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />
      <AdInterstitial open={adManager.showInterstitial} onDismiss={adManager.dismissInterstitial} />
    </main>
  );
}
