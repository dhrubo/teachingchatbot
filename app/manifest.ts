import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mr. Ranedeer — Edexcel GCSE Maths Voice Tutor",
    short_name: "Ranedeer Maths",
    description:
      "Voice-first Pearson Edexcel GCSE (9–1) Maths tutor explaining topics in 5 distinct ways with daily Duolingo-style streaks.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1026",
    theme_color: "#0B1026",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
