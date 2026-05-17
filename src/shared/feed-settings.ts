// Producer-side configuration for the WebRTC video feed. Persisted in
// localStorage on the producer machine and threaded into useFeedPublisher.

export type FeedBitratePreset = "standard" | "high" | "maximum";
export type FeedCodecPreset = "auto" | "prefer-h264" | "vp8-only";

export interface FeedSettings {
  bitrate: FeedBitratePreset;
  codec: FeedCodecPreset;
}

export const FEED_BITRATE_BPS: Record<FeedBitratePreset, number> = {
  standard: 5_000_000,
  high: 15_000_000,
  maximum: 30_000_000,
};

export const FEED_BITRATE_LABELS: Record<FeedBitratePreset, string> = {
  standard: "Standard (5 Mbps)",
  high: "High (15 Mbps)",
  maximum: "Maximum (30 Mbps)",
};

export const FEED_CODEC_RANKINGS: Record<FeedCodecPreset, string[]> = {
  // Best quality on Chromium/Firefox laptops; iPad falls back to H.264.
  auto: ["video/VP9", "video/H264", "video/VP8"],
  // Useful when most casters are on iPad — keeps hardware decoding on iOS and
  // avoids a software VP9 path on the producer side.
  "prefer-h264": ["video/H264", "video/VP9", "video/VP8"],
  // Strictly the universally-supported baseline codec.
  "vp8-only": ["video/VP8"],
};

export const FEED_CODEC_LABELS: Record<FeedCodecPreset, string> = {
  auto: "Auto (recommended)",
  "prefer-h264": "Prefer H.264 (best for iPad casters)",
  "vp8-only": "VP8 only (maximum compatibility)",
};

export const DEFAULT_FEED_SETTINGS: FeedSettings = {
  bitrate: "high",
  codec: "auto",
};

const STORAGE_KEY = "feed-settings";

export function readCachedFeedSettings(): FeedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEED_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<FeedSettings>;
    return {
      bitrate: parsed.bitrate ?? DEFAULT_FEED_SETTINGS.bitrate,
      codec: parsed.codec ?? DEFAULT_FEED_SETTINGS.codec,
    };
  } catch {
    return DEFAULT_FEED_SETTINGS;
  }
}

export function writeCachedFeedSettings(settings: FeedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / disabled storage
  }
}
