import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useTemplateStore } from '../../src/store/template-store';
import { createDefaultTemplate } from '../../src/constants/template-defaults';
import { Colors, Spacing } from '../../src/constants/theme';

export default function CreateTemplateScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { createTemplate } = useTemplateStore();

  const [name, setName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('20');
  const [options, setOptions] = useState('5');
  const [columns, setColumns] = useState('1');

  const handleSave = async () => {
    if (!name) {
      alert('Nama template harus diisi');
      return;
    }

    const tq = parseInt(totalQuestions, 10);
    if (isNaN(tq) || tq < 5 || tq > 100) {
      alert('Jumlah soal harus antara 5 - 100');
      return;
    }

    const template = createDefaultTemplate();
    template.name = name;
    template.totalQuestions = tq;
    template.optionsPerQuestion = parseInt(options, 10) as 4 | 5;
    template.columns = parseInt(columns, 10) as 1 | 2;

    await createTemplate(template);
    router.replace({ pathname: '/answer-key/create', params: { templateId: template.id } });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.formSection}>
        <TextInput
          label="Nama Template"
          value={name}
          onChangeText={setName}
          mode="outlined"
          placeholder="Cth: UTS Kelas 8"
          style={styles.input}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <TextInput
            label="Jumlah Soal"
            value={totalQuestions}
            onChangeText={setTotalQuestions}
            mode="outlined"
            keyboardType="number-pad"
            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: Spacing.md }]}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, flex: 1 }}>
            Min 5, Max 100 soal
          </Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Jumlah Opsi Jawaban</Text>
        <SegmentedButtons
          value={options}
          onValueChange={setOptions}
          buttons={[
            { value: '4', label: 'A, B, C, D (4)' },
            { value: '5', label: 'A, B, C, D, E (5)' },
          ]}
          style={styles.segment}
        />

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Format Kolom</Text>
        <SegmentedButtons
          value={columns}
          onValueChange={setColumns}
          buttons={[
            { value: '1', label: '1 Kolom' },
            { value: '2', label: '2 Kolom' },
          ]}
          style={styles.segment}
        />
      </View>

      <View style={styles.actionContainer}>
        <Button mode="contained" onPress={handleSave} style={styles.button}>
          Lanjut: Tentukan Kunci Jawaban
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formSection: {
    padding: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  segment: {
    marginBottom: Spacing.lg,
  },
  actionContainer: {
    padding: Spacing.lg,
  },
  button: {
    paddingVertical: 6,
  },
});
