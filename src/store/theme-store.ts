import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';

interface ThemeState {
  theme: ColorSchemeName;
  setTheme: (theme: ColorSchemeName) => void;
}

const getInitialTheme = (): ColorSchemeName => {
  return Appearance.getColorScheme() || 'light';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: ColorSchemeName) => {
    // Try to update system appearance if supported (mobile)
    if (typeof Appearance.setColorScheme === 'function') {
      try {
        Appearance.setColorScheme(theme);
      } catch (e) {
        console.warn('Appearance.setColorScheme failed', e);
      }
    }
    set({ theme });
  },
}));

// Listen to system changes
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.setState({ theme: colorScheme });
});
