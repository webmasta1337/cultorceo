import { useEffect, useMemo, useState, useRef } from "react";
import { Clipboard, Home, Rocket, Share2, Trophy, Eye, DollarSign, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { headshotPreloadSources, quoteHeadshots, quotes, type GameQuote, type QuoteSource } from "@/data/quotes";

const STORAGE_KEY = "cult-or-tech-stats-v2";

type RoundResult = {
  guess: QuoteSource;
  isCorrect: boolean;
};

type GameState = "landing" | "playing" | "nudge" | "revealing" | "gameover";

const TITLES = {
  cult: ["Apocalyptic Visionary", "Messianic Disruptor", "Void Weaver", "Shadow Prophet", "Eschaton Architect"],
  ceo: ["Golden Parachute Architect", "Series Z Survivor", "Equity Vampire", "Market Overlord", "Synergy High Priest"],
  hybrid: ["Chaotic Neutral Founder", "Prophet of Profit", "Venture Shaman", "Kool-Aid Consultant"]
};

export function CultTechGame() {
  const [gameState, setGameState] = useState<GameState>("landing");
  const [quoteOrder, setQuoteOrder] = useState<GameQuote[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stats, setStats] = useState({ streak: 0, bestStreak: 0, cultPoints: 0, ceoPoints: 0 });
  const [strikes, setStrikes] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorPhase, setCursorPhase] = useState<"eye" | "blink" | "dollar">("eye");
  const [showReveal, setShowReveal] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  
  const hesitationTimer = useRef<NodeJS.Timeout | null>(null);

  const currentQuote = useMemo(() => quoteOrder[roundIndex % quoteOrder.length], [quoteOrder, roundIndex]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      resetHesitation();
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const resetHesitation = () => {
    setCursorPhase("eye");
    if (hesitationTimer.current) clearTimeout(hesitationTimer.current);
    hesitationTimer.current = setTimeout(() => {
      if (gameState === "playing") setCursorPhase("dollar");
    }, 4000);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setStats(JSON.parse(saved));
    
    // Preload
    headshotPreloadSources.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    setQuoteOrder([...quotes].sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const startGame = () => {
    setGameState("playing");
    setRoundIndex(0);
    setStrikes(0);
    setResult(null);
    setStats({ streak: 0, bestStreak: 0, cultPoints: 0, ceoPoints: 0 });
  };

  const handleAnswer = (guess: QuoteSource) => {
    // Add a chance for a "Nudge"
    if (Math.random() > 0.8 && !isNudging) {
      setIsNudging(true);
      return;
    }

    const isCorrect = guess === currentQuote.source;
    setResult({ guess, isCorrect });
    
    setStats(prev => ({
      ...prev,
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: Math.max(prev.bestStreak, isCorrect ? prev.streak + 1 : 0),
      cultPoints: prev.cultPoints + (guess === "cult_leader" ? 1 : 0),
      ceoPoints: prev.ceoPoints + (guess === "ceo" ? 1 : 0),
    }));

    if (!isCorrect) {
      setStrikes(s => {
        if (s + 1 >= 3) {
          setTimeout(() => setGameState("gameover"), 2000);
          return s + 1;
        }
        return s + 1;
      });
    }

    setIsNudging(false);
    setGameState("revealing");
    setShowReveal(false);
    setTimeout(() => setShowReveal(true), 100);
  };

  const nextRound = () => {
    if (gameState === "gameover") return;
    setRoundIndex(prev => prev + 1);
    setResult(null);
    setGameState("playing");
  };

  const generateTitle = () => {
    const total = stats.cultPoints + stats.ceoPoints || 1;
    const cultRatio = stats.cultPoints / total;
    const ceoRatio = stats.ceoPoints / total;

    if (cultRatio > 0.6) return TITLES.cult[Math.floor(Math.random() * TITLES.cult.length)];
    if (ceoRatio > 0.6) return TITLES.ceo[Math.floor(Math.random() * TITLES.ceo.length)];
    return TITLES.hybrid[Math.floor(Math.random() * TITLES.hybrid.length)];
  };

  return (
    <main className="relative min-h-screen selection:bg-ritual-red selection:text-white overflow-hidden">
      <div className="duality-bg" />
      
      {/* Eye Cursor */}
      <div 
        className="eye-cursor hidden lg:block" 
        style={{ left: mousePos.x - 12, top: mousePos.y - 12 }}
      >
        {cursorPhase === "dollar" && <DollarSign className="absolute inset-1 h-4 w-4 text-glitch-green animate-pulse" />}
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 flex flex-col min-h-screen">
        
        {/* LANDING PAGE */}
        {gameState === "landing" && (
          <section className="flex flex-1 flex-col items-center justify-center text-center animate-fade-in">
            <div className="retina-scan mb-12 ceo-glass group hover:border-ritual-red transition-colors duration-500">
              <Eye className="h-24 w-24 text-corp-blue group-hover:text-ritual-red transition-colors duration-1000" />
            </div>
            
            <h1 className="mb-4 font-serif text-6xl font-black tracking-tighter sm:text-9xl">
              CULT<span className="text-ritual-red animate-pulse">OR</span>CEO
            </h1>
            <p className="mb-12 font-ui text-[10px] font-bold uppercase tracking-[0.8em] text-corp-blue">
              A PROPHET, OR FOR-PROFIT?
            </p>
            
            <div className="flex flex-col gap-6 w-full max-w-xs">
              <Button 
                onClick={startGame}
                className="h-20 w-full rounded-none border-2 border-corp-blue bg-transparent text-xl font-bold uppercase tracking-widest text-corp-blue hover:bg-corp-blue hover:text-void hover:shadow-corp transition-all duration-500"
              >
                INITIATE SCAN
              </Button>
              <p className="text-[10px] uppercase tracking-widest text-white/20 animate-glitch">DATA LEAK DETECTED: SEC-VOID-MANIFESTO.PDF</p>
            </div>
          </section>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "playing" && (
          <section className="flex-1 flex flex-col justify-center animate-fade-in">
            <header className="mb-12 flex items-center justify-between border-b border-white/10 pb-6">
              <div className="font-ui text-[10px] font-bold uppercase tracking-widest text-corp-blue">
                Indoctrination Phase: {roundIndex + 1}
              </div>
              <div className="flex gap-4">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-3 w-3 rounded-none rotate-45 border ${i <= strikes ? "bg-ritual-red border-ritual-red shadow-ritual" : "border-white/20"}`} />
                  ))}
                </div>
              </div>
            </header>

            <div className="mb-2 self-destruct-progress w-full">
              <div className="self-destruct-progress-fill" style={{ width: `${((roundIndex % 10) + 1) * 10}%` }} />
            </div>
            <p className="mb-12 text-[9px] font-bold uppercase tracking-widest text-white/30">Cognitive Load: {Math.round(((roundIndex % 10) + 1) * 10)}%</p>

            <div className="group relative ceo-glass overflow-hidden p-8 sm:p-20 border-l-[12px] border-ritual-red transition-all duration-500 hover:border-l-[24px]">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none select-none font-serif text-[12rem]">§</div>
              <blockquote className="relative z-10 font-serif text-3xl font-black leading-tight text-white sm:text-5xl italic">
                “{currentQuote.quote}”
              </blockquote>
              <div className="mt-12 font-ui text-[10px] font-bold uppercase tracking-[0.5em] text-ritual-red animate-glitch">CLASSIFIED EXHIBIT #{currentQuote.id}</div>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <button 
                onMouseEnter={() => setCursorPhase("blink")}
                onMouseLeave={() => setCursorPhase("eye")}
                onClick={() => handleAnswer("cult_leader")}
                className="group relative h-32 overflow-hidden bg-void border border-ritual-red/30 p-1 hover:border-ritual-red transition-all duration-300"
              >
                <div className="flex h-full w-full flex-col items-center justify-center bg-ritual-red/5 font-ui text-2xl font-black uppercase tracking-[0.4em] text-ritual-red group-hover:bg-ritual-red/20">
                  OBEY
                  <span className="text-[8px] opacity-0 group-hover:opacity-40 transition-opacity mt-2">Cult Leader</span>
                </div>
              </button>
              
              <button 
                onMouseEnter={() => setCursorPhase("blink")}
                onMouseLeave={() => setCursorPhase("eye")}
                onClick={() => handleAnswer("ceo")}
                className="group relative h-32 overflow-hidden bg-void border border-corp-blue/30 p-1 hover:border-corp-blue transition-all duration-300"
              >
                <div className="flex h-full w-full flex-col items-center justify-center bg-corp-blue/5 font-ui text-2xl font-black uppercase tracking-[0.4em] text-corp-blue group-hover:bg-corp-blue/20">
                  INVEST
                  <span className="text-[8px] opacity-0 group-hover:opacity-40 transition-opacity mt-2">Tech CEO</span>
                </div>
              </button>
            </div>

            {isNudging && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-xl animate-fade-in">
                <div className="text-center p-8 border-2 border-ritual-red animate-pulse">
                  <h3 className="font-serif text-3xl font-black text-ritual-red mb-6 uppercase tracking-widest">The Oracle Demands Certainty</h3>
                  <p className="text-white/60 mb-8 uppercase text-[10px] tracking-widest leading-loose">Are you prepared for the consequences of this choice?</p>
                  <Button 
                    onClick={() => handleAnswer(currentQuote.source)} // Force correct for the nudge or just let them pick? 
                    className="h-16 px-12 rounded-none bg-ritual-red text-white font-bold uppercase tracking-widest"
                  >
                    I AM CERTAIN
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* REVEAL SCREEN */}
        {gameState === "revealing" && showReveal && (
          <section className="flex-1 flex flex-col justify-center items-center text-center animate-fade-in">
            <div className="mb-12 relative">
              <div className="absolute -inset-4 border-2 border-gold/20 animate-spin-slow" />
              <div className="relative h-56 w-56 overflow-hidden rounded-none border-4 border-gold shadow-[0_0_50px_rgba(201,169,110,0.3)]">
                <img 
                  src={quoteHeadshots[currentQuote.id].src} 
                  alt={currentQuote.attribution} 
                  className="h-full w-full object-cover grayscale brightness-50" 
                />
              </div>
            </div>
            
            <p className={`mb-4 font-ui text-xs font-bold uppercase tracking-[0.6em] ${result?.isCorrect ? "text-glitch-green" : "text-ritual-red"}`}>
              {result?.isCorrect ? "VERIFICATION SUCCESSFUL" : "JUDGMENT ERROR"}
            </p>
            
            <h2 className="mb-8 font-serif text-5xl font-black text-white sm:text-7xl uppercase tracking-tighter">
              {currentQuote.attribution}
            </h2>
            
            <div className="mx-auto max-w-2xl ceo-glass p-10 border-t-4 border-gold mb-16 relative">
              <Sparkles className="absolute -top-3 -left-3 h-6 w-6 text-gold" />
              <p className="font-ui text-lg leading-relaxed text-white">
                {currentQuote.reveal}
              </p>
            </div>

            <Button 
              onClick={nextRound}
              className="h-20 w-full max-w-sm rounded-none bg-white text-void font-black text-xl uppercase tracking-[0.2em] hover:bg-gold hover:text-void transition-all duration-500 shadow-ritual"
            >
              ASCEND
            </Button>
          </section>
        )}

        {/* GAME OVER / RESULTS */}
        {gameState === "gameover" && (
          <section className="flex-1 flex flex-col justify-center animate-fade-in text-center">
            <div className="mb-12 flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <h2 className="font-serif text-4xl font-black text-white sm:text-6xl uppercase tracking-widest">JUDGMENT</h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid gap-8 sm:grid-cols-2 mb-16">
              <div className="ceo-glass p-12 group transition-all duration-500 hover:bg-corp-blue/5">
                <p className="text-6xl font-black text-corp-blue mb-4 transition-transform group-hover:scale-110">
                  {Math.round((stats.ceoPoints / (stats.ceoPoints + stats.cultPoints || 1)) * 100)}%
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/50">EQUITY OPTIMIZED</p>
              </div>
              <div className="ceo-glass p-12 group transition-all duration-500 hover:bg-ritual-red/5">
                <p className="text-6xl font-black text-ritual-red mb-4 transition-transform group-hover:scale-110">
                  {Math.round((stats.cultPoints / (stats.ceoPoints + stats.cultPoints || 1)) * 100)}%
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/50">DIVINELY ALIGNED</p>
              </div>
            </div>

            <div className="mb-16 border-4 border-gold p-16 bg-gold/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <p className="mb-6 font-ui text-[11px] font-bold uppercase tracking-[0.5em] text-gold">FINAL DESIGNATION</p>
              <h3 className="font-serif text-4xl font-black text-white sm:text-7xl italic tracking-tight">{generateTitle()}</h3>
            </div>

            <div className="flex flex-col gap-6 max-w-md mx-auto">
              <Button 
                onClick={startGame}
                className="h-20 rounded-none bg-ritual-red text-2xl font-black uppercase tracking-[0.2em] text-white hover:scale-105 transition-transform shadow-ritual"
              >
                RE-INITIALIZE
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => {
                    const msg = `I am a "${generateTitle()}". 60% Cult, 40% CEO. Can you tell the difference? ${window.location.href}`;
                    navigator.clipboard.writeText(msg);
                  }}
                  className="h-14 rounded-none border border-white/20 bg-transparent text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10"
                >
                  EXPORT MANIFESTO
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="h-14 rounded-none border border-white/20 bg-transparent text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10"
                >
                  VOID SYSTEM
                </Button>
              </div>
            </div>
            
            <p className="mt-20 text-[9px] uppercase tracking-[0.6em] text-white/20 font-bold">© 2026 VOID-CORP / NO SALVATION WITHOUT EQUITY</p>
          </section>
        )}

      </div>
    </main>
  );
}
