import { useEffect, useMemo, useState } from "react";
import { Clipboard, Home, Rocket, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
          <section className="flex flex-1 flex-col items-center justify-center py-14 text-center animate-fade-in">
            <h1 className="max-w-4xl font-serif text-5xl font-black leading-none text-foreground sm:text-7xl lg:text-8xl">
              Cult or CEO?
            </h1>
            <p className="mt-6 max-w-2xl font-ui text-base leading-7 text-muted-foreground sm:text-lg">
              One wants your eternal soul. The other wants your equity. Can you tell the difference?
            </p>
            <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Button className="h-14 flex-1 text-base" variant="chapel" onClick={startGame}>
                Play
              </Button>
              <Button className="h-14 flex-1 text-base" variant="outline" onClick={() => setStatsOpen(true)}>
                View stats
              </Button>
            </div>
            <Carousel className="mt-8 w-full max-w-xl" opts={{ loop: true }}>
              <CarouselContent>
                {vibeSlides.map((slide) => (
                  <CarouselItem key={slide.label}>
                    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 text-center backdrop-blur-md shadow-ritual transition-all hover:border-primary/50">
                      <div className="absolute -right-4 -top-4 font-serif text-9xl opacity-10 text-primary">“</div>
                      <p className="font-ui text-[10px] font-bold uppercase tracking-[0.3em] text-primary/80">{slide.label}</p>
                      <p className="mt-6 font-serif text-2xl font-black leading-tight text-foreground sm:text-4xl">
                        {slide.quote}
                      </p>
                      <div className="mt-8 inline-block rounded-full border border-primary/30 px-6 py-2 font-ui text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
                        {slide.action}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 top-auto -bottom-16 translate-y-0" />
              <CarouselNext className="right-2 top-auto -bottom-16 translate-y-0" />
            </Carousel>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8 animate-fade-in">
            <h1 className="sr-only">Cult or CEO? Gameplay</h1>
            <div className="mb-5 flex items-center justify-between gap-3 font-ui text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Streak {stats.streak}</span>
              <div className="flex gap-1 items-center">
                <span>Strikes:</span>
                {[1, 2, 3].map((i) => (
                  <span key={i} className={`text-lg ${i <= strikes ? "text-red-500 font-bold" : "text-muted opacity-30"}`}>X</span>
                ))}
              </div>
            </div>
            <div className="mb-6 grid grid-cols-10 gap-1.5" aria-label="Round progress">
              {progressDots.map((quote, index) => (
                <span key={quote.id} className={`h-1.5 rounded-full ${index === roundIndex % 10 ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <article className={`quote-card ${answerClass}`}>
              {result?.isCorrect && (
                <div className="correct-burst" aria-live="polite">
                  <span>Correct!</span>
                </div>
              )}
              <p className="font-ui text-xs uppercase tracking-[0.32em] text-muted-foreground">Quote #{currentQuote.id}</p>
              <blockquote className="mt-6 font-serif text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">
                “{currentQuote.quote}”
              </blockquote>
            </article>

            {!result ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button className="h-16 text-base sm:text-lg" variant="cult" onClick={() => answer("cult_leader")}>
                  <span aria-hidden="true">🕯️</span> Cult Leader
                </Button>
                <Button className="h-16 text-base sm:text-lg" variant="tech" onClick={() => answer("ceo")}>
                  <Rocket /> CEO
                </Button>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-ritual animate-glitch-in">
                <div className="grid gap-5 sm:grid-cols-[9rem_1fr] sm:items-start">
                  <figure className="speaker-frame overflow-hidden rounded-lg border border-border bg-secondary">
                    <img
                      src={currentHeadshot.src}
                      alt={currentHeadshot.alt}
                      className="speaker-headshot aspect-square w-full object-cover grayscale"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                    <figcaption className="px-3 py-2 font-ui text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Verified: {currentHeadshot.source}
                    </figcaption>
                  </figure>
                  <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.2em] ${badgeClass}`}>
                    {sourceLabel(currentQuote.source)}
                  </span>
                  <span className="font-serif text-2xl font-black leading-tight text-foreground sm:text-3xl">{currentQuote.attribution}</span>
                </div>
                <p className="mt-4 font-ui text-base leading-7 text-muted-foreground">{currentQuote.reveal}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {!gameOver ? (
                    <Button className="h-12" variant="chapel" onClick={nextRound}>
                      Next Quote
                    </Button>
                  ) : (
                    <Button className="h-12" variant="chapel" onClick={startGame}>
                      Play Again
                    </Button>
                  )}
                  <Button className="h-12" variant="outline" onClick={shareScore}>
                    {shareStatus === "Copied" ? <Clipboard /> : <Share2 />} {shareStatus}
                  </Button>
                </div>
              </div>
            )}
            
            {gameOver && (
              <div className="mt-6 text-center animate-fade-in">
                <h2 className="font-serif text-3xl font-black text-red-500">GAME OVER</h2>
                <p className="mt-2 text-muted-foreground">You survived {roundIndex} rounds. They caught on to you.</p>
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
