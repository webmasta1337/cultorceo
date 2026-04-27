import { useEffect, useRef } from "react";

export function AdsterraSlot() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '<div id="container-894fa0f9619314f2cde7babaae3febf1"></div>';
    
    // Inject the Adsterra script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://pl29276956.profitablecpmratenetwork.com/894fa0f9619314f2cde7babaae3febf1/invoke.js";
    
    containerRef.current.appendChild(script);
  }, []);

  return <div ref={containerRef} className="w-full flex items-center justify-center min-h-[50px] overflow-hidden" />;
}
