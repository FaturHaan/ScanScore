import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Card, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTemplateStore } from '../../src/store/template-store';
import { printTemplate } from '../../src/utils/pdf-generator';
import { Colors, Spacing } from '../../src/constants/theme';

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const { activeTemplate, setActiveTemplate, isLoading } = useTemplateStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      setActiveTemplate(id);
    }
  }, [id]);

  if (isLoading || !activeTemplate) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handlePrint = async () => {
    setIsGeneratingPDF(true);
    try {
      await printTemplate(activeTemplate);
    } catch (e) {
      alert('Gagal generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Title title={activeTemplate.name} subtitle={`Dibuat pada ${new Date(activeTemplate.createdAt).toLocaleDateString()}`} />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jumlah Soal</Text>
            <Text style={styles.infoValue}>{activeTemplate.totalQuestions}</Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Opsi Jawaban</Text>
            <Text style={styles.infoValue}>{activeTemplate.optionsPerQuestion} (A-{String.fromCharCode(64 + activeTemplate.optionsPerQuestion)})</Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Layout</Text>
            <Text style={styles.infoValue}>{activeTemplate.columns} Kolom</Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ukuran Kertas</Text>
            <Text style={styles.infoValue}>{activeTemplate.paperSize}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button 
          mode="contained" 
          icon="printer" 
          onPress={handlePrint} 
          loading={isGeneratingPDF}
          style={styles.button}
        >
          Cetak Lembar Jawaban (PDF)
        </Button>
        
        <Button 
          mode="outlined" 
          icon="key" 
          onPress={() => router.push({ pathname: '/answer-key/create', params: { templateId: activeTemplate.id } })}
          style={styles.button}
        >
          Buat Kunci Jawaban
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.base,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: Spacing.xl,
    backgroundColor: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    color: Colors.neutral[600],
  },
  infoValue: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: Spacing.xs,
  },
  actions: {
    gap: Spacing.md,
  },
  button: {
    paddingVertical: 6,
  },
});
