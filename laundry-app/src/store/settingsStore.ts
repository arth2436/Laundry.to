import { create } from 'zustand';
import { CompanySettings } from '@/types';
import { settingsDB, DEFAULT_SETTINGS } from '@/lib/db';

interface SettingsState {
  settings: CompanySettings;
  load: () => void;
  updateSettings: (settings: CompanySettings) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  load: () => set({ settings: settingsDB.get() }),
  updateSettings: (newSettings) => {
    settingsDB.save(newSettings);
    set({ settings: newSettings });
  },
}));

if (typeof window !== 'undefined') {
  // Listen for storage events from other tabs to sync settings in real-time
  window.addEventListener('storage', (e) => {
    if (e.key === 'lms_settings') {
      useSettingsStore.getState().load();
    }
  });
}
