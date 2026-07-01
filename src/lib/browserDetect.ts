/** Best-effort Safari detection. Not a proxy for Apple Intelligence availability. */
export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
}
