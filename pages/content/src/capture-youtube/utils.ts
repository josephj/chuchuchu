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

const getPotValue = async (): Promise<string | null> => {
  return new Promise(resolve => {
    // Create a listener for network requests
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('timedtext') && entry.name.includes('pot=')) {
          const url = new URL(entry.name);
          const pot = url.searchParams.get('pot');
          if (pot) {
            observer.disconnect();
            resolve(pot);
            return;
          }
        }
      }
    });

    // Start observing network requests
    observer.observe({ entryTypes: ['resource'] });

    // Get the subtitles button and its current state
    const subtitlesButton = document.querySelector('.ytp-subtitles-button');
    if (subtitlesButton instanceof HTMLElement) {
      const wasEnabled = subtitlesButton.getAttribute('aria-pressed') === 'true';

      // Only click if subtitles are not already enabled
      if (!wasEnabled) {
        subtitlesButton.click();
      }

      // Set a timeout to restore the original state
      setTimeout(() => {
        if (!wasEnabled) {
          subtitlesButton.click();
        }
      }, 1000);
    }

    // Set a timeout in case we don't get a response
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 5000);
  });
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
              const url = new URL(englishTrack.baseUrl);
              url.searchParams.append('potc', '1');

              // Get the pot value by simulating subtitles button click
              const pot = await getPotValue();
              if (pot) {
                url.searchParams.append('pot', pot);
              }

              url.searchParams.append('c', 'WEB');
              url.searchParams.append('cplatform', 'DESKTOP');

              const response = await fetch(url.toString());
              const xmlText = await response.text();

              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
              const textElements = xmlDoc.getElementsByTagName('text');

              // Start with WebVTT header
              let transcript = 'WEBVTT\n\n';

              transcript += Array.from(textElements)
                .map(element => {
                  const start = element.getAttribute('start');
                  const duration = element.getAttribute('dur');
                  const speaker = element.getAttribute('speaker') || 'Speaker';
                  const text = element.textContent?.replace(/&#39;/g, "'") || '';

                  if (!start || !duration) return '';

                  // Convert start time to VTT format (HH:MM:SS.mmm)
                  const startTime = new Date(Number(start) * 1000).toISOString().substr(11, 12);
                  const endTime = new Date((Number(start) + Number(duration)) * 1000).toISOString().substr(11, 12);

                  // Format the VTT entry
                  return `${startTime} --> ${endTime}\n${speaker}: ${text}\n`;
                })
                .filter(Boolean)
                .join('\n');

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
