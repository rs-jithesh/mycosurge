import type { OfflineReport } from '@mycosurge/game-engine';

/**
 * Developer features, off by default. Flip the flag manually in the browser
 * console to reveal them:
 *
 *   localStorage.setItem('mycosurge_dev', 'true')
 *
 * Reload afterwards (or call `devStore.refresh()`). Setting it to any other
 * value, or removing the key, turns dev features back off.
 */
const DEV_KEY = 'mycosurge_dev';

function readFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEV_KEY) === 'true';
  } catch {
    return false;
  }
}

/** A representative report for previewing the welcome-back dialog. */
const SAMPLE_REPORT: OfflineReport = {
  elapsedSeconds: 4 * 3600 + 18 * 60,
  appliedSeconds: (4 * 3600 + 18 * 60) * 0.75,
  rate: 0.75,
  biomassGained: 412,
  waterGained: 96.4,
  nutrientsGained: 88.2,
  lysateStabilized: 24,
  expeditionsCompleted: 2,
  wasCapped: true,
};

let enabled = $state(readFlag());
let previewReport = $state<OfflineReport | null>(null);

export const devStore = {
  get enabled() {
    return enabled;
  },
  /** The offline report being previewed, or null. */
  get previewReport() {
    return previewReport;
  },
  /** Re-read the localStorage flag (after flipping it in devtools). */
  refresh() {
    enabled = readFlag();
    if (!enabled) previewReport = null;
  },
  /** Flip the flag on/off and persist it. */
  set(value: boolean) {
    enabled = value;
    if (!enabled) previewReport = null;
    try {
      if (value) localStorage.setItem(DEV_KEY, 'true');
      else localStorage.removeItem(DEV_KEY);
    } catch {
      // storage unavailable — the in-memory flag still applies for this session
    }
  },
  previewWelcomeBack() {
    previewReport = SAMPLE_REPORT;
  },
  clearPreview() {
    previewReport = null;
  },
};
