export type YouTubeData = {
  title: string | null;
  description: string | null;
  transcript: string | null;
  channel: string | null;
  publishDate: string | null;
  url: string;
};

export type CaptionTrack = {
  baseUrl: string;
  vssId?: string;
  languageCode?: string;
  name?: { simpleText: string };
  kind?: string;
};

export type YouTubePlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
  videoDetails?: {
    videoId: string;
  };
};
