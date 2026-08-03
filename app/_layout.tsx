import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '../src/constants/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    import('../src/db/schema').then(({ initDatabase }) => {
      initDatabase().then(() => setDbInitialized(true)).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (loaded && dbInitialized) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbInitialized]);

  if (!loaded || !dbInitialized) {
    return null;
  }

  return <RootLayoutNav />;
}

const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary[600],
    secondary: Colors.accent[500],
    error: Colors.danger[500],
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary[400],
    secondary: Colors.accent[400],
    error: Colors.danger[400],
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? customDarkTheme : customLightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="template/create" options={{ title: 'Buat Template', presentation: 'card' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Detail Template', presentation: 'card' }} />
        <Stack.Screen name="answer-key/create" options={{ title: 'Buat Kunci Jawaban', presentation: 'card' }} />
        <Stack.Screen name="scan/camera" options={{ headerShown: false }} />
        <Stack.Screen name="scan/preview" options={{ title: 'Preview Hasil', presentation: 'card' }} />
        <Stack.Screen name="results/[id]" options={{ title: 'Detail Hasil', presentation: 'card' }} />
        <Stack.Screen name="results/review/[id]" options={{ title: 'Review Manual', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="results/summary" options={{ title: 'Rekap Kelas', presentation: 'card' }} />
      </Stack>
    </PaperProvider>
  );
}
