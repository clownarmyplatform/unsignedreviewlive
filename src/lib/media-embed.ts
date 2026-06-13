export type EmbeddedMedia =
  | {
      provider: "youtube" | "soundcloud" | "bandcamp";
      embedUrl: string;
      externalLabel: string;
    }
  | null;

function getYouTubeEmbedUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (
      url.pathname.startsWith("/shorts/") ||
      url.pathname.startsWith("/live/")
    ) {
      videoId = url.pathname.split("/")[2] ?? null;
    }
  } else if (host === "youtu.be") {
    videoId = url.pathname.split("/")[1] ?? null;
  }

  if (!videoId) {
    return null;
  }

  const origin =
    typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";

  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0${origin ? `&origin=${origin}` : ""}`;
}

function getSoundCloudEmbedUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");

  if (host !== "soundcloud.com" && host !== "m.soundcloud.com") {
    return null;
  }

  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}`;
}

function getBandcampEmbedUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const isBandcampDomain = host === "bandcamp.com" || host.endsWith(".bandcamp.com");

  if (!isBandcampDomain) {
    return null;
  }

  if (url.pathname.includes("/EmbeddedPlayer/")) {
    return url.toString();
  }

  return null;
}

export function getEmbeddedMedia(input: string): EmbeddedMedia {
  try {
    const url = new URL(input);

    const youtubeEmbed = getYouTubeEmbedUrl(url);
    if (youtubeEmbed) {
      return {
        provider: "youtube",
        embedUrl: youtubeEmbed,
        externalLabel: "Open on YouTube",
      };
    }

    const soundCloudEmbed = getSoundCloudEmbedUrl(url);
    if (soundCloudEmbed) {
      return {
        provider: "soundcloud",
        embedUrl: soundCloudEmbed,
        externalLabel: "Open on SoundCloud",
      };
    }

    const bandcampEmbed = getBandcampEmbedUrl(url);
    if (bandcampEmbed) {
      return {
        provider: "bandcamp",
        embedUrl: bandcampEmbed,
        externalLabel: "Open on Bandcamp",
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeEmbeddableUrl(input: string) {
  const embeddedMedia = getEmbeddedMedia(input);
  return embeddedMedia ? embeddedMedia.embedUrl : input;
}
