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
    label: "PHASE 01: THE QUOTE",
    quote: "Is it a radical startup vision or a dangerous cult decree?",
    action: "READ CAREFULLY"
  },
  {
    label: "PHASE 02: THE CHOICE",
    quote: "Pick your path. Is this a Tech Visionary or a Master Manipulator?",
    action: "CHOOSE WISELY"
  },
  {
    label: "PHASE 03: THE SURVIVAL",
    quote: "You have 3 strikes. One wrong move and you're out.",
    action: "STAY SHARP"
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
    <main className="relative min-h-screen bg-background pb-12 text-foreground">
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
            <div className="mt-9 flex w-full max-w-md flex-col gap-4 sm:flex-row">
              <Button className="h-16 flex-1 text-lg font-bold uppercase tracking-wider rounded-xl bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-98" onClick={startGame}>
                Play Game
              </Button>
              <Button className="h-16 flex-1 text-lg font-bold uppercase tracking-wider rounded-xl border-2 border-border bg-card shadow-lg" variant="outline" onClick={() => setStatsOpen(true)}>
                Stats
              </Button>
            </div>
            
            <Carousel className="mt-20 w-full max-w-xl" opts={{ loop: true }}>
              <CarouselContent>
                {vibeSlides.map((slide) => (
                  <CarouselItem key={slide.label}>
                    <div className="group relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-card p-12 text-center shadow-2xl transition-all">
                      <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">{slide.label}</p>
                      <p className="mt-8 font-serif text-3xl font-bold leading-snug text-foreground sm:text-4xl">
                        “{slide.quote}”
                      </p>
                      <div className="mt-10 inline-block rounded-full bg-primary/10 px-8 py-3 font-ui text-xs font-black uppercase tracking-widest text-primary border border-primary/20">
                        {slide.action}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex left-[-3rem]" />
              <CarouselNext className="hidden sm:flex right-[-3rem]" />
            </Carousel>

            <div className="mt-24 flex flex-col items-center gap-3 text-muted-foreground/60">
              <span className="font-ui text-xs font-bold uppercase tracking-widest">How it works</span>
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>

            <div className="mt-32 grid w-full max-w-4xl gap-12 px-4 pb-20 text-left sm:grid-cols-3">
              <div className="flex flex-col gap-6">
                <div className="font-serif text-5xl font-black text-primary/40">01</div>
                <h3 className="font-ui text-sm font-black uppercase tracking-wider text-foreground">The Challenge</h3>
                <p className="text-base leading-relaxed text-muted-foreground font-medium">
                  We’ve collected 60+ verified quotes from the world's most powerful tech moguls and most notorious cult leaders. Your job is to tell them apart.
                </p>
              </div>
              <div className="flex flex-col gap-6">
                <div className="font-serif text-5xl font-black text-primary/40">02</div>
                <h3 className="font-ui text-sm font-black uppercase tracking-wider text-foreground">The Choice</h3>
                <p className="text-base leading-relaxed text-muted-foreground font-medium">
                  Visionary leadership or high-control rhetoric? When the language of "disruption" meets the language of "transcendence," the line disappears.
                </p>
              </div>
              <div className="flex flex-col gap-6">
                <div className="font-serif text-5xl font-black text-primary/40">03</div>
                <h3 className="font-ui text-sm font-black uppercase tracking-wider text-foreground">The Survival</h3>
                <p className="text-base leading-relaxed text-muted-foreground font-medium">
                  You have 3 strikes. One wrong move and the system catches you. Survive as many rounds as possible and climb the global leaderboards.
                </p>
              </div>
            </div>

            <div className="mt-20 w-full max-w-3xl border-t-2 border-border pt-20 text-center">
              <h2 className="font-serif text-4xl font-black text-foreground sm:text-6xl">Why we built this.</h2>
              <p className="mt-8 font-ui text-lg leading-relaxed text-muted-foreground">
                In the modern age, the "Founder" has become a messianic figure. We built <span className="text-primary font-bold">Cult or CEO</span> to highlight how easily the grammar of business can be swapped for the grammar of worship. Test your intuition against the most influential minds in history.
              </p>
              <Button className="mt-14 h-20 px-12 rounded-full bg-primary text-xl font-bold uppercase tracking-wider text-primary-foreground shadow-xl" onClick={startGame}>
                Start Playing
              </Button>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8 animate-fade-in">
            <h1 className="sr-only">Cult or CEO? Gameplay</h1>
            <div className="mb-5 flex items-center justify-between gap-3 font-ui text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Streak {stats.streak}</span>
              <div className="flex gap-1 items-center">
                <span>Strikes:</span>
                {[1, 2, 3].map((i) => (
                  <span key={i} className={`text-lg transition-colors ${i <= strikes ? "text-red-500 font-bold" : "text-muted opacity-30"}`}>X</span>
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
              <p className="font-ui text-sm font-bold uppercase tracking-widest text-primary/60">Quote #{currentQuote.id}</p>
              <blockquote className="mt-10 font-serif text-4xl font-bold leading-snug text-foreground sm:text-6xl">
                “{currentQuote.quote}”
              </blockquote>
            </article>

            {!result ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button className="h-16 text-base sm:text-lg rounded-xl border-border bg-card shadow-ritual hover:bg-muted" variant="outline" onClick={() => answer("cult_leader")}>
                   Cult Leader
                </Button>
                <Button className="h-16 text-base sm:text-lg rounded-xl bg-primary text-primary-foreground shadow-ritual transition-transform hover:scale-105" onClick={() => answer("ceo")}>
                  CEO
                </Button>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-ritual animate-glitch-in">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="speaker-frame h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-border shadow-ritual">
                    <img src={quoteHeadshots[currentQuote.id].src} alt={quoteHeadshots[currentQuote.id].alt} className="speaker-headshot h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                       <span className={`rounded-full px-4 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.2em] bg-primary text-primary-foreground`}>
                        {currentQuote.source === "ceo" ? "CEO" : "CULT LEADER"}
                      </span>
                      <h2 className="font-serif text-3xl font-black text-foreground">{currentQuote.attribution}</h2>
                    </div>
                    <p className="mt-4 font-ui text-base font-medium leading-relaxed text-foreground">
                      {currentQuote.reveal}
                    </p>
                  </div>
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {!gameOver ? (
                    <Button className="h-14 flex-1 text-base font-bold uppercase tracking-widest rounded-full bg-primary text-primary-foreground shadow-ritual" onClick={nextRound}>
                      Continue
                    </Button>
                  ) : (
                    <Button className="h-14 flex-1 text-base font-bold uppercase tracking-widest rounded-full bg-red-600 text-white shadow-ritual" onClick={startGame}>
                      Try Again
                    </Button>
                  )}
                  <Button className="h-14 flex-1 text-base font-bold uppercase tracking-widest rounded-full border-border bg-card" variant="outline" onClick={shareScore}>
                    Share
                  </Button>
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
