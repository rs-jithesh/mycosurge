import { LOG_MAX_ENTRIES, LOG_REPEAT_WINDOW_SECONDS } from '@mycosurge/config';

export interface LogEntry {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'error' | 'success';
  timestamp: number;
  /** Consecutive identical lines fold into one entry with a count. */
  count: number;
}

let nextId = 0;
let entries = $state<LogEntry[]>([]);

function add(text: string, level: LogEntry['level'] = 'info') {
  const now = Date.now();
  const last = entries[entries.length - 1];

  // Collapse a repeat of the same line so routine actions don't flood the feed.
  if (
    last &&
    last.text === text &&
    last.level === level &&
    now - last.timestamp < LOG_REPEAT_WINDOW_SECONDS * 1000
  ) {
    entries = [...entries.slice(0, -1), { ...last, count: last.count + 1, timestamp: now }];
    return;
  }

  entries = [
    ...entries.slice(-(LOG_MAX_ENTRIES - 1)),
    { id: nextId++, text, level, timestamp: now, count: 1 },
  ];
}

export const logStore = {
  get entries() {
    return entries;
  },
  info: (text: string) => add(text, 'info'),
  warn: (text: string) => add(text, 'warn'),
  error: (text: string) => add(text, 'error'),
  success: (text: string) => add(text, 'success'),
  clear: () => {
    entries = [];
  },
};
