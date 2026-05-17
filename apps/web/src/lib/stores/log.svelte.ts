export interface LogEntry {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'error' | 'success';
  timestamp: number;
}

let nextId = 0;
let entries = $state<LogEntry[]>([]);

function add(text: string, level: LogEntry['level'] = 'info') {
  entries = [...entries.slice(-99), { id: nextId++, text, level, timestamp: Date.now() }];
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
