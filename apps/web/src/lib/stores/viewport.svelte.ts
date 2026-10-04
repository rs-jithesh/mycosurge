const DESKTOP_QUERY = '(min-width: 768px)';

/**
 * Reactive app breakpoint. The Core renders a deliberate composition per breakpoint
 * (radial wheel on desktop, mode hero on mobile) rather than relying on CSS stacking
 * alone, while both compositions share the same components, data and tokens.
 */
function createViewportStore() {
  let isDesktop = $state(
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches,
  );

  if (typeof window !== 'undefined') {
    const mql = window.matchMedia(DESKTOP_QUERY);
    mql.addEventListener('change', (event) => {
      isDesktop = event.matches;
    });
  }

  return {
    get isDesktop() {
      return isDesktop;
    },
  };
}

export const viewport = createViewportStore();
