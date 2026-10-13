/** Lucide v1 ships no brand icons; a simple neutral LinkedIn mark. */
export function LinkedInMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10.5v6M7.5 7.6v.1M11 16.5v-6m0 2.6c0-1.6 1-2.7 2.4-2.7s2.1 1 2.1 2.6v3.5" fill="none"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
