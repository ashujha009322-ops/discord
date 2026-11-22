import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/calling",
    name: "Calling App",
    short_name: "Calling",
    description: "Peer-to-peer voice and video calling app.",

    start_url: "/calling",
    scope: "/",

    display: "standalone",
    orientation: "any",

    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",

    categories: ["social", "communication"],

    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
