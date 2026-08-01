import React, { useEffect } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Text, Card, FAB, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTemplateStore } from '../../src/store/template-store';
import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';
import { AnswerSheetTemplate } from '../../src/types/template';

export default function TemplatesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { templates, loadTemplates, isLoading } = useTemplateStore();

  useEffect(() => {
    loadTemplates();
  }, []);

  const renderTemplateItem = ({ item }: { item: AnswerSheetTemplate }) => (
    <Card 
      style={styles.card}
      onPress={() => router.push(`/template/${item.id}`)}
    >
      <Card.Title
        title={item.name}
        subtitle={`${item.totalQuestions} Soal • ${item.optionsPerQuestion} Opsi (${item.columns} Kolom)`}
        left={(props) => (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.primary[600]} />
          </View>
        )}
        right={(props) => (
          <IconButton
            {...props}
            icon="dots-vertical"
            onPress={() => {/* Show options */}}
          />
        )}
      />
      <Card.Content>
        <Text style={styles.dateText}>
          Dibuat: {new Date(item.createdAt).toLocaleDateString('id-ID')}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplateItem}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={loadTemplates}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-plus-outline" size={64} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>Belum ada Template</Text>
              <Text style={styles.emptySubtitle}>
                Buat template lembar jawaban pertama Anda untuk mulai menilai.
              </Text>
            </View>
          ) : null
        }
      />
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => router.push('/template/create')}
        label="Buat Template"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 100, // Space for FAB
  },
  card: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.neutral[500],
    lineHeight: 20,
  },
});
