import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTemplateStore } from '../../src/store/template-store';
import { useAnswerKeyStore } from '../../src/store/answer-key-store';
import { DEFAULT_GRADING_CONFIG, AnswerKey } from '../../src/types/answer';
import { Colors, Spacing } from '../../src/constants/theme';

export default function CreateAnswerKeyScreen() {
  const { templateId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const { activeTemplate, setActiveTemplate } = useTemplateStore();
  const { createAnswerKey } = useAnswerKeyStore();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  const [correctScore, setCorrectScore] = useState('1');
  const [wrongPenalty, setWrongPenalty] = useState('0');
  const [blankScore, setBlankScore] = useState('0');
  const [maxScore, setMaxScore] = useState('100');

  useEffect(() => {
    if (templateId && typeof templateId === 'string') {
      setActiveTemplate(templateId);
    }
  }, [templateId]);

  if (!activeTemplate) return null;

  const handleAnswerSelect = (qNum: number, option: string) => {
    setAnswers(prev => ({ ...prev, [qNum]: option }));
  };

  const handleSave = async () => {
    if (!name) {
      alert('Nama kunci jawaban harus diisi');
      return;
    }

    if (Object.keys(answers).length < activeTemplate.totalQuestions) {
      alert('Mohon isi semua kunci jawaban terlebih dahulu');
      return;
    }

    const key: AnswerKey = {
      id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      templateId: activeTemplate.id,
      name,
      subject,
      answers,
      gradingConfig: {
        correctScore: parseFloat(correctScore) || 1,
        wrongPenalty: parseFloat(wrongPenalty) || 0,
        blankScore: parseFloat(blankScore) || 0,
        totalMaxScore: parseFloat(maxScore) || 100,
      },
      createdAt: Date.now(),
    };

    await createAnswerKey(key);
    router.replace('/(tabs)/');
    alert('Kunci Jawaban berhasil disimpan!');
  };

  const optionLabels = 'ABCDE'.slice(0, activeTemplate.optionsPerQuestion).split('');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Ujian</Text>
          <TextInput
            label="Nama Ujian"
            value={name}
            onChangeText={setName}
            mode="outlined"
            placeholder="Cth: UTS Ganjil 2026"
            style={styles.input}
          />
          <TextInput
            label="Mata Pelajaran"
            value={subject}
            onChangeText={setSubject}
            mode="outlined"
            placeholder="Cth: Matematika"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistem Penilaian</Text>
          <View style={styles.row}>
            <TextInput label="Benar" value={correctScore} onChangeText={setCorrectScore} keyboardType="numeric" mode="outlined" style={[styles.input, styles.flex1]} />
            <View style={{ width: 10 }} />
            <TextInput label="Salah" value={wrongPenalty} onChangeText={setWrongPenalty} keyboardType="numeric" mode="outlined" style={[styles.input, styles.flex1]} />
          </View>
          <View style={styles.row}>
            <TextInput label="Kosong" value={blankScore} onChangeText={setBlankScore} keyboardType="numeric" mode="outlined" style={[styles.input, styles.flex1]} />
            <View style={{ width: 10 }} />
            <TextInput label="Nilai Maksimal" value={maxScore} onChangeText={setMaxScore} keyboardType="numeric" mode="outlined" style={[styles.input, styles.flex1]} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Input Kunci Jawaban</Text>
            <Text style={styles.progressText}>
              {Object.keys(answers).length} / {activeTemplate.totalQuestions}
            </Text>
          </View>
          
          <View style={styles.gridContainer}>
            {Array.from({ length: activeTemplate.totalQuestions }).map((_, i) => {
              const qNum = i + 1;
              return (
                <View key={qNum} style={styles.questionRow}>
                  <Text style={styles.qNumText}>{qNum}.</Text>
                  <SegmentedButtons
                    value={answers[qNum] || ''}
                    onValueChange={(val) => handleAnswerSelect(qNum, val)}
                    buttons={optionLabels.map(opt => ({
                      value: opt,
                      label: opt,
                    }))}
                    style={styles.optionsSegment}
                    density="small"
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button mode="contained" onPress={handleSave} style={styles.button}>
            Simpan Kunci Jawaban
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: Spacing.base,
    backgroundColor: '#fff',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.neutral[800],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  input: {
    marginBottom: Spacing.md,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  gridContainer: {
    gap: Spacing.sm,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qNumText: {
    width: 30,
    fontWeight: 'bold',
    fontSize: 16,
  },
  optionsSegment: {
    flex: 1,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  button: {
    paddingVertical: 6,
  },
});
