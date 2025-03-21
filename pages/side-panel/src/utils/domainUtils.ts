/**
 * Checks if a URL belongs to a restricted Google domain where content scripts can't run
 *
 * @param url - The URL to check
 * @returns True if the URL is a restricted Google domain, false otherwise
 */
export const isRestrictedGoogleDomain = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'accounts.google.com' ||
      parsedUrl.hostname === 'chrome.google.com' ||
      parsedUrl.hostname === 'docs.google.com' ||
      parsedUrl.hostname === 'chromewebstore.google.com' ||
      (parsedUrl.hostname.endsWith('.google.com') &&
        (parsedUrl.hostname.startsWith('myaccount.') ||
          parsedUrl.hostname.startsWith('admin.') ||
          parsedUrl.hostname.startsWith('apis.') ||
          parsedUrl.hostname.startsWith('developers.')))
    );
  } catch (e) {
    return false; // Invalid URL
  }
};
