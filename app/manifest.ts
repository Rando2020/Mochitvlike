import type { MetadataRoute } from "next";
import { CRAYVO } from "@/lib/brand/crayvo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CRAYVO.fullName,
    short_name: CRAYVO.shortName,
    description: "Create original shows, characters, episodes, and worlds.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#101117",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" }
    ]
  };
}
