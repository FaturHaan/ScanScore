import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Switch, useTheme, Divider } from 'react-native-paper';
import { Colors, Spacing } from '../../src/constants/theme';
import { useThemeStore } from '../../src/store/theme-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const currentTheme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const isDark = currentTheme === 'dark';

  const toggleTheme = (val: boolean) => {
    setTheme(val ? 'dark' : 'light');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Tampilan</Text>
        <View style={styles.row}>
          <Text style={{ color: theme.colors.onBackground, fontSize: 16 }}>Mode Gelap</Text>
          <Switch value={isDark} onValueChange={toggleTheme} color={Colors.primary[500]} />
        </View>
        <Divider style={styles.divider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.md,
  },
});
