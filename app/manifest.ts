import type { MetadataRoute } from "next";

/** PWA manifest for the client app (scoped to /app so only the portal installs). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DCS Construction",
    short_name: "DCS",
    description: "Track your DCS Construction requests, projects, estimates, and messages.",
    start_url: "/app",
    scope: "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#024988",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
