import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, useTheme, Button, DataTable } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

import { useResultStore } from '../../src/store/result-store';
import { exportSummaryToCSV, exportSummaryToPDF } from '../../src/services/export-service';
import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';

export default function ClassSummaryScreen() {
  const { answerKeyId } = useLocalSearchParams();
  const theme = useTheme();
  
  const { classSummary, loadClassSummary, isLoading } = useResultStore();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // In a real app we'd get these details from the answerKey/template
    if (answerKeyId && typeof answerKeyId === 'string') {
      loadClassSummary(answerKeyId, 'UTS Mock', 'Matematika', 20, 5);
    }
  }, [answerKeyId]);

  if (isLoading || !classSummary) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Memuat ringkasan kelas...</Text>
      </View>
    );
  }

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportSummaryToPDF(classSummary);
    } catch (e) {
      alert('Gagal export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportSummaryToCSV(classSummary);
    } catch (e) {
      alert('Gagal export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Overview Stats */}
      <View style={styles.overviewGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Rata-rata</Text>
          <Text style={styles.statValue}>{classSummary.averageScore}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Tertinggi</Text>
          <Text style={[styles.statValue, { color: Colors.accent[600] }]}>{classSummary.highestScore}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Terendah</Text>
          <Text style={[styles.statValue, { color: Colors.danger[600] }]}>{classSummary.lowestScore}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Siswa</Text>
          <Text style={styles.statValue}>{classSummary.totalStudents}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button mode="contained" icon="file-pdf-box" onPress={handleExportPDF} loading={isExporting} style={styles.actionBtn}>
          Export PDF
        </Button>
        <Button mode="outlined" icon="file-excel" onPress={handleExportCSV} loading={isExporting} style={styles.actionBtn}>
          Export CSV
        </Button>
      </View>

      {/* Results Table */}
      <Card style={styles.card}>
        <Card.Title title="Daftar Nilai Siswa" />
        <Card.Content style={{ paddingHorizontal: 0 }}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Nama</DataTable.Title>
              <DataTable.Title numeric>B/S</DataTable.Title>
              <DataTable.Title numeric>Nilai</DataTable.Title>
            </DataTable.Header>

            {classSummary.results.slice(0, 10).map((result) => (
              <DataTable.Row key={result.id}>
                <DataTable.Cell>{result.studentName || 'Tanpa Nama'}</DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text style={{ color: Colors.accent[600] }}>{result.correctCount}</Text>
                  /
                  <Text style={{ color: Colors.danger[600] }}>{result.wrongCount}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text style={{ fontWeight: 'bold' }}>{result.finalScore}</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
            
            {classSummary.results.length > 10 && (
              <View style={styles.moreRow}>
                <Text style={{ color: Colors.neutral[500] }}>
                  ... dan {classSummary.results.length - 10} siswa lainnya
                </Text>
              </View>
            )}
          </DataTable>
        </Card.Content>
      </Card>
      
      <View style={{ height: Spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
  },
  statBox: {
    width: '45%',
    backgroundColor: '#fff',
    margin: '2.5%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary[700],
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
  card: {
    marginHorizontal: Spacing.base,
    backgroundColor: '#fff',
  },
  moreRow: {
    padding: Spacing.md,
    alignItems: 'center',
  },
});
