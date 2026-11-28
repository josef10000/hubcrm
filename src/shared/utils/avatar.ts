export function getCleanPhotoURL(url: unknown): string {
  if (typeof url !== 'string' || !url) return '';
  if (url.includes('api.dicebear.com') && !url.includes('backgroundColor=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}backgroundColor=transparent`;
  }
  return url;
}
