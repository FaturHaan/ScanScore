import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, List, useTheme, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useResultStore } from '../../src/store/result-store';
import { Colors, Spacing } from '../../src/constants/theme';
import { GradingResult } from '../../src/types/result';

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { recentResults, loadRecentResults, isLoading } = useResultStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRecentResults(50); // Load more for history tab
  }, []);

  const filteredResults = recentResults.filter(result => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return result.needsReview && !result.isReviewed;
    return true;
  });

  const renderItem = ({ item }: { item: GradingResult }) => {
    const isNeedsReview = item.needsReview && !item.isReviewed;
    
    return (
      <List.Item
        title={item.studentName || 'Tanpa Nama'}
        description={`Kunci: ${item.answerKeyId || 'UTS'} • ${new Date(item.scannedAt).toLocaleDateString('id-ID')}`}
        left={props => (
          <List.Icon 
            {...props} 
            icon={isNeedsReview ? "alert-circle" : "check-circle"} 
            color={isNeedsReview ? Colors.warm[500] : Colors.accent[500]} 
          />
        )}
        right={props => (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.finalScore}</Text>
          </View>
        )}
        onPress={() => router.push(`/results/${item.id}`)}
        style={styles.listItem}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'Semua' },
            { value: 'needs_review', label: 'Perlu Review' },
          ]}
          style={styles.segment}
        />
      </View>

      <FlatList
        data={filteredResults}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={() => loadRecentResults(50)}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {filter === 'all' 
                  ? 'Belum ada riwayat scan.' 
                  : 'Tidak ada hasil yang perlu direview.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.base,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  segment: {
    width: '100%',
  },
  listItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scoreContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.md,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  emptyState: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.neutral[500],
  },
});
