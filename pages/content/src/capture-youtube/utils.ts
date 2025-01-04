import type { YouTubePlayerResponse } from './types';

export const getVideoIdFromUrl = (url: string): string | null => {
  const urlObj = new URL(url);
  const videoId = urlObj.searchParams.get('v');

  return videoId;
};

const isTranscriptAvailable = (): boolean => {
  const transcriptButton = document.querySelector('button[aria-label="Show transcript"]');
  return !!transcriptButton;
};

const isPlayerResponseUpToDate = (): { upToDate: boolean; hasTranscript: boolean } => {
  const scripts = Array.from(document.querySelectorAll('script'));
  const currentVideoId = getVideoIdFromUrl(window.location.href);
  if (!currentVideoId) return { upToDate: false, hasTranscript: false };

  const hasTranscript = isTranscriptAvailable();
  for (const script of scripts) {
    const content = script.textContent || '';
    if (content.includes('ytInitialPlayerResponse')) {
      const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match && match[1]) {
        try {
          const playerResponse = JSON.parse(match[1]) as YouTubePlayerResponse;
          const responseVideoId = playerResponse?.videoDetails?.videoId;
          return {
            upToDate: responseVideoId === currentVideoId,
            hasTranscript,
          };
        } catch {
          return { upToDate: false, hasTranscript };
        }
      }
    }
  }
  return { upToDate: false, hasTranscript };
};

export const getTranscript = async (): Promise<string | null> => {
  try {
    const currentVideoId = getVideoIdFromUrl(window.location.href);
    if (!currentVideoId) {
      return null;
    }

    const { upToDate, hasTranscript } = isPlayerResponseUpToDate();

    if (!upToDate && !hasTranscript) {
      return null;
    }

    if (!upToDate && hasTranscript) {
      return new Promise(resolve => {
        chrome.runtime.sendMessage(
          {
            type: 'RELOAD_AND_CAPTURE',
            url: window.location.href,
          },
          () => resolve(null),
        );
      });
    }

    const scripts = Array.from(document.querySelectorAll('script'));

    for (const script of scripts) {
      const content = script.textContent || '';

      if (content.includes('ytInitialPlayerResponse')) {
        const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (match && match[1]) {
          const playerResponse = JSON.parse(match[1]) as YouTubePlayerResponse;

          const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (captionTracks && captionTracks.length > 0) {
            const englishTrack =
              captionTracks.find(track => track.languageCode === 'en' || track.vssId?.includes('.en')) ||
              captionTracks[0];

            if (englishTrack?.baseUrl) {
              const response = await fetch(englishTrack.baseUrl);
              const xmlText = await response.text();

              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
              const textElements = xmlDoc.getElementsByTagName('text');

              const transcript = Array.from(textElements)
                .map(element => element.textContent?.replace(/&#39;/g, "'") || '')
                .join(' ');

              return transcript;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const getDescription = async (): Promise<string | null> => {
  try {
    const expandButton = document.querySelector('tp-yt-paper-button#expand');
    if (expandButton instanceof HTMLElement) {
      expandButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const selectors = [
      '#description-inline-expander .ytd-text-inline-expander',
      '#description-inline-expander ytd-expander[collapsed] #description',
      '#description-inline-expander #description',
      'ytd-expander[slot="expander"] #content',
    ];

    let description: string | null = null;

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        description = element.textContent;
        break;
      }
    }

    return description?.trim() || null;
  } catch (error) {
    return null;
  }
};

export const getChannelName = (): string | null =>
  document.querySelector('#owner #channel-name a')?.textContent?.trim() || null;

export const getPublishDate = (): string | null =>
  document.querySelector('#info-strings yt-formatted-string')?.textContent?.trim() || null;
