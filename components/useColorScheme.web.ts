import { useThemeStore } from '../src/store/theme-store';

export function useColorScheme() {
  const theme = useThemeStore((state) => state.theme);
  return theme === 'unspecified' ? 'light' : theme;
}
