import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Button, IconButton, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';
import { useResultStore } from '../../src/store/result-store';
import { getTodayResultCount, getResultCount } from '../../src/db/queries';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { recentResults, loadRecentResults, isLoading } = useResultStore();
  
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const total = await getResultCount();
      const today = await getTodayResultCount();
      setStats({ total, today });
    } catch (e) {
      console.error('Error fetching stats', e);
    }
  };

  const loadData = async () => {
    await Promise.all([
      loadRecentResults(5),
      fetchStats()
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* Welcome Banner */}
      <View style={[styles.banner, { backgroundColor: theme.colors.primaryContainer }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.onPrimaryContainer }]}>Halo, Guru!</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onPrimaryContainer }]}>Siap menilai ujian hari ini?</Text>
        </View>
        <Avatar.Icon size={56} icon="school" style={{ backgroundColor: theme.colors.primary }} color="#fff" />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.accent[100] }]}>
              <MaterialCommunityIcons name="calendar-check" size={24} color={Colors.accent[600]} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.today}</Text>
              <Text style={styles.statLabel}>Scan Hari Ini</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.iconContainer, { backgroundColor: Colors.primary[100] }]}>
              <MaterialCommunityIcons name="file-multiple" size={24} color={Colors.primary[600]} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Scan</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Main Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push('/scan/camera')}
        >
          <MaterialCommunityIcons name="camera-iris" size={32} color="#fff" />
          <Text style={styles.actionText}>Scan LJK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: Colors.accent[500] }]}
          activeOpacity={0.8}
          onPress={() => router.push('/template/create')}
        >
          <MaterialCommunityIcons name="file-document-edit" size={32} color="#fff" />
          <Text style={styles.actionText}>Buat Template</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Scans */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Scan Terakhir</Text>
        <Button mode="text" onPress={() => router.push('/(tabs)/history')} compact>
          Lihat Semua
        </Button>
      </View>

      {isLoading && !refreshing ? (
        <Text style={styles.emptyText}>Memuat data...</Text>
      ) : recentResults.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyState}>
            <MaterialCommunityIcons name="tray" size={48} color={theme.colors.outline} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Belum ada data</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Mulai scan lembar jawaban untuk melihat hasilnya di sini.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        recentResults.map((result, index) => (
          <Card 
            key={result.id} 
            style={styles.resultCard}
            onPress={() => router.push(`/results/${result.id}`)}
          >
            <Card.Title
              title={result.studentName || 'Tanpa Nama'}
              subtitle={new Date(result.scannedAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              left={(props) => <Avatar.Icon {...props} icon="account" />}
              right={(props) => (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{result.finalScore}</Text>
                </View>
              )}
            />
            {result.needsReview && !result.isReviewed && (
              <Card.Content>
                <View style={styles.warningBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.warm[700]} />
                  <Text style={styles.warningText}>Perlu direview manual (ambigu)</Text>
                </View>
              </Card.Content>
            )}
          </Card>
        ))
      )}
      
      <View style={{ height: Spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    margin: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  scoreBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 16,
  },
  scoreText: {
    color: Colors.primary[700],
    fontWeight: 'bold',
    fontSize: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warm[100],
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    color: Colors.warm[800],
    fontSize: 12,
    marginLeft: 6,
  },
  emptyCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    padding: Spacing.xl,
    opacity: 0.5,
  },
});
