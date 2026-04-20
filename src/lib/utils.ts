import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts Google Drive shareable links into direct image HTML links
export function getDirectImageUrl(url: string) {
  if (!url) return '';
  // Match standard file links
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000-h800`;
  }
  // Match open links
  const openRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  if (url.includes('drive.google.com') && url.match(openRegex)) {
    const openMatch = url.match(openRegex);
    if (openMatch && openMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000-h800`;
    }
  }
  return url;
}
