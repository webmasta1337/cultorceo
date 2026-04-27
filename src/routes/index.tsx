import { createFileRoute } from "@tanstack/react-router";
import { CultTechGame } from "@/components/game/CultTechGame";
import { headshotPreloadSources } from "@/data/quotes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cult or CEO?" },
      {
        name: "description",
        content: "Guess whether dystopian visionary quotes came from cult leaders or CEOs.",
      },
      { property: "og:title", content: "Cult or CEO?" },
      {
        property: "og:description",
        content: "A dark quote guessing game where salvation theology and CEO disruption sound terrifyingly alike.",
      },
    ],
    links: headshotPreloadSources.map((href) => ({
      rel: "preload",
      as: "image",
      href,
      fetchPriority: "high",
    })),
  }),
  component: Index,
});

function Index() {
  return <CultTechGame />;
}
