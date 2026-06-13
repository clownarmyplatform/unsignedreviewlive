import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clown Army Studio",
    short_name: "CA Studio",
    description: "Weekly music show submissions, queue control, and community updates.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/clown-army-logo.jpg",
        sizes: "256x256",
        type: "image/jpeg",
      },
    ],
  };
}
