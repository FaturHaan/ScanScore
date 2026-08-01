import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button, IconButton, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useResultStore } from '../../src/store/result-store';
import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';

export default function ResultDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const { activeResult, setActiveResult, isLoading } = useResultStore();

  useEffect(() => {
    if (id && typeof id === 'string') {
      setActiveResult(id);
    }
  }, [id]);

  if (isLoading || !activeResult) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Memuat hasil...</Text>
      </View>
    );
  }

  const {
    studentName,
    studentNumber,
    finalScore,
    correctCount,
    wrongCount,
    blankCount,
    details,
    needsReview,
    isReviewed
  } = activeResult;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Score Header */}
      <View style={styles.header}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreText}>{finalScore}</Text>
        </View>
        <Text style={styles.studentName}>{studentName || 'Siswa Tanpa Nama'}</Text>
        <Text style={styles.studentInfo}>No. Absen: {studentNumber || '-'}</Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: Colors.accent[50] }]}>
          <Text style={[styles.statValue, { color: Colors.accent[700] }]}>{correctCount}</Text>
          <Text style={styles.statLabel}>Benar</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.danger[50] }]}>
          <Text style={[styles.statValue, { color: Colors.danger[700] }]}>{wrongCount}</Text>
          <Text style={styles.statLabel}>Salah</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.neutral[100] }]}>
          <Text style={[styles.statValue, { color: Colors.neutral[700] }]}>{blankCount}</Text>
          <Text style={styles.statLabel}>Kosong</Text>
        </View>
      </View>

      {/* Review Banner */}
      {needsReview && !isReviewed && (
        <Card style={styles.warningCard}>
          <Card.Content style={styles.warningContent}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.warm[600]} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Perlu Review Manual</Text>
              <Text style={styles.warningDesc}>Ada jawaban yang ambigu atau kurang jelas.</Text>
            </View>
            <Button mode="contained" buttonColor={Colors.warm[600]} onPress={() => router.push(`/results/review/${activeResult.id}`)} compact>
              Review
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Answer Details Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detail Jawaban</Text>
        <View style={styles.grid}>
          {details.map((q) => {
            const isCorrect = q.isCorrect;
            const isBlank = q.detectedAnswer === null;
            const isWarning = q.needsReview && !isReviewed;

            let bgColor = Colors.danger[50];
            let textColor = Colors.danger[700];
            
            if (isCorrect) {
              bgColor = Colors.accent[50];
              textColor = Colors.accent[700];
            } else if (isBlank) {
              bgColor = Colors.neutral[100];
              textColor = Colors.neutral[600];
            } else if (isWarning) {
              bgColor = Colors.warm[50];
              textColor = Colors.warm[700];
            }

            return (
              <View key={q.questionNumber} style={[styles.qCell, { backgroundColor: bgColor }]}>
                <Text style={styles.qNumber}>{q.questionNumber}</Text>
                <Text style={[styles.qAnswer, { color: textColor }]}>
                  {q.detectedAnswer || '-'}
                </Text>
                {!isCorrect && !isBlank && (
                  <Text style={styles.qCorrect}>(Kunci: {q.correctAnswer})</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Scanned Image Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bukti Fisik (Scan)</Text>
        <View style={styles.imagePlaceholder}>
          <Text style={{ color: Colors.neutral[500] }}>
            Gambar LJK akan ditampilkan di sini
          </Text>
        </View>
      </View>
      
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
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scoreText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  studentInfo: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginTop: 4,
  },
  warningCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.warm[50],
    borderWidth: 1,
    borderColor: Colors.warm[200],
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  warningTitle: {
    fontWeight: 'bold',
    color: Colors.warm[800],
  },
  warningDesc: {
    fontSize: 12,
    color: Colors.warm[700],
  },
  section: {
    padding: Spacing.base,
    backgroundColor: '#fff',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.neutral[800],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  qCell: {
    width: '18%', // Approx 5 columns
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  qNumber: {
    fontSize: 12,
    color: Colors.neutral[500],
    fontWeight: 'bold',
  },
  qAnswer: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  qCorrect: {
    fontSize: 10,
    color: Colors.danger[700],
  },
  imagePlaceholder: {
    height: 300,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderStyle: 'dashed',
  },
});
