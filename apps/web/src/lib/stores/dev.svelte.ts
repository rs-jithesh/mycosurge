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
/** Independent visibility toggle for the advisor tuning panel. */
const PANEL_KEY = 'mycosurge_dev_panel';
/** Persisted panel position in viewport pixels. */
const PANEL_POS_KEY = 'mycosurge_dev_panel_pos';

function readFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEV_KEY) === 'true';
  } catch {
    return false;
  }
}

function readPanelFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(PANEL_KEY) === 'true';
  } catch {
    return false;
  }
}

function readPanelPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(PANEL_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // ignore malformed position
  }
  return null;
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
let showAdvisorPanel = $state(readPanelFlag());
let advisorPanelPos = $state<{ x: number; y: number } | null>(readPanelPos());

export const devStore = {
  get enabled() {
    return enabled;
  },
  /** The offline report being previewed, or null. */
  get previewReport() {
    return previewReport;
  },
  /** Whether the movable advisor tuning panel is shown (dev tools only). */
  get showAdvisorPanel() {
    return showAdvisorPanel;
  },
  setShowAdvisorPanel(value: boolean) {
    showAdvisorPanel = value;
    try {
      if (value) localStorage.setItem(PANEL_KEY, 'true');
      else localStorage.removeItem(PANEL_KEY);
    } catch {
      // storage unavailable — the in-memory flag still applies for this session
    }
  },
  /** Last dragged position of the advisor panel, or null for the default corner. */
  get advisorPanelPos() {
    return advisorPanelPos;
  },
  setAdvisorPanelPos(pos: { x: number; y: number }) {
    advisorPanelPos = pos;
    try {
      localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos));
    } catch {
      // storage unavailable — position is not remembered
    }
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
