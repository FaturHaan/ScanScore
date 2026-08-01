import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert } from 'react-native';
import { Text, useTheme, Button, SegmentedButtons, Appbar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { useResultStore } from '../../../src/store/result-store';
import { useAnswerKeyStore } from '../../../src/store/answer-key-store';
import { Colors, Spacing, BorderRadius } from '../../../src/constants/theme';
import { regradeWithCorrections } from '../../../src/services/grading-engine';
import * as db from '../../../src/db/queries';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const { activeResult, setActiveResult, isLoading: resultLoading, saveResult } = useResultStore();
  const { answerKeys, loadAnswerKeys } = useAnswerKeyStore();

  // Local state for corrections
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      setActiveResult(id);
    }
  }, [id]);
  
  useEffect(() => {
    if (answerKeys.length === 0) {
      loadAnswerKeys();
    }
  }, []);

  useEffect(() => {
    // Initialize corrections with current detected answers
    if (activeResult) {
      const initial: Record<number, string> = {};
      activeResult.details.forEach(d => {
        initial[d.questionNumber] = d.detectedAnswer || '?';
      });
      setCorrections(initial);
    }
  }, [activeResult]);

  if (resultLoading || !activeResult) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Memuat data...</Text>
      </View>
    );
  }

  const handleCorrectionChange = (qNum: number, val: string) => {
    setCorrections(prev => ({
      ...prev,
      [qNum]: val
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Get the answer key for regrading
      let key = answerKeys.find(k => k.id === activeResult.answerKeyId);
      if (!key) {
        // Fallback to db query if not in store
        key = await db.getAnswerKeyById(activeResult.answerKeyId) || undefined;
      }
      
      if (!key) {
        Alert.alert('Error', 'Kunci jawaban tidak ditemukan untuk regrading.');
        return;
      }

      // Convert '?' back to null for blank answers
      const finalCorrections: Record<number, string> = {};
      Object.keys(corrections).forEach(k => {
        const qNum = parseInt(k, 10);
        finalCorrections[qNum] = corrections[qNum] === '?' ? '' : corrections[qNum];
      });

      // Regrade
      const updatedResult = regradeWithCorrections(activeResult, finalCorrections, key.answers, key.gradingConfig);
      
      // Save to store and DB
      await saveResult(updatedResult);
      
      Alert.alert('Sukses', 'Review berhasil disimpan.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan hasil review.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'Review Jawaban',
        headerLeft: () => (
           <Appbar.BackAction onPress={() => router.back()} />
        )
      }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollArea}>
          
          {/* Image Preview Area */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Bukti Fisik (Scan)</Text>
            {activeResult.scanImagePath ? (
              <Image 
                source={{ uri: activeResult.scanImagePath }}
                style={styles.scanImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={{ color: Colors.neutral[500] }}>Gambar tidak tersedia</Text>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Corrections List */}
          <View style={styles.correctionsSection}>
            <Text style={styles.sectionTitle}>Koreksi Jawaban</Text>
            <Text style={styles.sectionDesc}>Ubah jawaban yang terdeteksi salah atau ambigu. Tanda (?) berarti kosong/tidak valid.</Text>

            {activeResult.details.map((q) => {
              const isWarning = q.needsReview && !q.isCorrect;
              return (
                <View key={q.questionNumber} style={[styles.questionRow, isWarning && styles.questionRowWarning]}>
                  <View style={styles.questionMeta}>
                    <Text style={styles.questionNumber}>No. {q.questionNumber}</Text>
                    {isWarning && (
                      <Text style={styles.warningTag}>Ambigu</Text>
                    )}
                  </View>
                  
                  <SegmentedButtons
                    value={corrections[q.questionNumber] || '?'}
                    onValueChange={(val) => handleCorrectionChange(q.questionNumber, val)}
                    buttons={[
                      { value: 'A', label: 'A' },
                      { value: 'B', label: 'B' },
                      { value: 'C', label: 'C' },
                      { value: 'D', label: 'D' },
                      { value: 'E', label: 'E' },
                      { value: '?', label: '?' },
                    ]}
                    style={styles.segmentedBtn}
                    density="regular"
                  />
                </View>
              );
            })}
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          >
            Simpan & Hitung Ulang
          </Button>
        </View>
      </View>
    </>
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
  scrollArea: {
    flex: 1,
  },
  imageSection: {
    padding: Spacing.base,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    color: Colors.neutral[900],
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.neutral[600],
    marginBottom: Spacing.lg,
  },
  scanImage: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.md,
    backgroundColor: '#000',
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 8,
    backgroundColor: Colors.neutral[100],
  },
  correctionsSection: {
    padding: Spacing.base,
    backgroundColor: '#fff',
  },
  questionRow: {
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
  },
  questionRowWarning: {
    backgroundColor: Colors.warm[50],
    borderLeftWidth: 4,
    borderLeftColor: Colors.warm[500],
  },
  questionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  questionNumber: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningTag: {
    fontSize: 11,
    color: Colors.warm[700],
    backgroundColor: Colors.warm[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  segmentedBtn: {
    width: '100%',
  },
  footer: {
    padding: Spacing.base,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingBottom: Spacing.xl,
  },
  saveButton: {
    backgroundColor: Colors.primary[600],
  }
});
