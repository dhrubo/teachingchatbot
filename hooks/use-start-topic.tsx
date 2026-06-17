"use client";

import { useCallback } from "react";
import {
  type ActiveMission,
  useMission,
} from "@/components/chat/mission-orchestrator";
import { type ConceptCard, fallbackConceptCards } from "@/lib/ai/missions";
import { MIN_CONCEPT_CARDS_BEFORE_CHALLENGE } from "@/lib/challenge-gate";

// Mission ids from the dashboard look like "missions/percentages" or already a
// bare DB slug ("percentages"); the adaptive engine + /api/lessons key off the
// bare slug.
function bareSlug(idOrSlug: string): string {
  return idOrSlug.replace(/^missions\//, "");
}

/**
 * Starts a topic the RIGHT way: loads its concept cards from the DB and hands
 * them to the mission orchestrator, which runs the gated
 * cards → footer → explicit-challenge flow. NO LLM call, NO auto-challenge.
 *
 * This replaces the old behaviour where picking a topic fired a sendMessage()
 * to the tutor (ungated chat), which is what caused topics to jump into
 * questions after a single card + an "ok".
 */
export function useStartTopic() {
  const { beginMissionLoading, startMissionWithCards } = useMission();

  return useCallback(
    async (input: { id: string; title: string; emoji?: string }) => {
      const slug = bareSlug(input.id);
      const active: ActiveMission = {
        slug,
        title: input.title,
        emoji: input.emoji ?? "📖",
      };

      beginMissionLoading(active);

      let cards: ConceptCard[] = [];
      try {
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const res = await fetch(
          `${base}/api/lessons?missionCards=${encodeURIComponent(slug)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { cards?: ConceptCard[] };
          cards = data.cards ?? [];
        }
      } catch {
        // Network/DB unavailable — fall through to deterministic fallback.
      }

      // Guarantee at least the minimum number of cards before the challenge can
      // ever be offered, padding with deterministic fallbacks if needed.
      if (cards.length < MIN_CONCEPT_CARDS_BEFORE_CHALLENGE) {
        const fallback = fallbackConceptCards(input.title);
        cards = [...cards, ...fallback].slice(
          0,
          MIN_CONCEPT_CARDS_BEFORE_CHALLENGE
        );
      }

      startMissionWithCards(active, cards);
    },
    [beginMissionLoading, startMissionWithCards]
  );
}
