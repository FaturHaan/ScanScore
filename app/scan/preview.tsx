import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';
import { decodeImageForCV } from '../../src/cv/image-decoder';
import { processAnswerSheet } from '../../src/cv/pipeline';
import { gradeAnswers } from '../../src/services/grading-engine';
import { useTemplateStore } from '../../src/store/template-store';
import { useAnswerKeyStore } from '../../src/store/answer-key-store';
import { useResultStore } from '../../src/store/result-store';
import { createDefaultTemplate } from '../../src/constants/template-defaults';
import { GradingResult } from '../../src/types/result';

export default function ScanPreviewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const imageUri = params.imageUri as string;
  const [isProcessing, setIsProcessing] = useState(true);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  
  const { activeTemplate } = useTemplateStore();
  const { activeAnswerKey } = useAnswerKeyStore();
  const { saveResult } = useResultStore();

  useEffect(() => {
    let isCancelled = false;

    async function runPipeline() {
      if (!imageUri) return;
      try {
        // 1. Decode image into raw pixels (resizing to max 1200px height for memory safety)
        const rgbaImage = await decodeImageForCV(imageUri, 1200);
        if (isCancelled) return;
        
        // 2. Prepare Template
        const template = activeTemplate || createDefaultTemplate('Mock Template');
        
        // 3. Process CV Pipeline
        const result = await processAnswerSheet(rgbaImage, template);
        if (isCancelled) return;
        
        if (!result.success) {
          alert('Gagal memproses LJK: ' + result.error);
          setIsProcessing(false);
          return;
        }
        
        // 4. Prepare Answer Key (Mock if not present)
        const answerKeyDict: Record<number, string> = {};
        if (activeAnswerKey) {
          Object.assign(answerKeyDict, activeAnswerKey.answers);
        } else {
          // Fill dummy answer key A for all questions
          for(let i = 1; i <= template.totalQuestions; i++) {
            answerKeyDict[i] = 'A';
          }
        }
        
        // 5. Grade the detected answers
        const graded = gradeAnswers(
          result.detections,
          answerKeyDict,
          activeAnswerKey?.gradingConfig || {},
          {
            studentName: 'Siswa ' + Math.floor(Math.random() * 1000),
            answerKeyId: activeAnswerKey?.id || 'mock-key',
            templateId: template.id,
            scanImagePath: imageUri,
          }
        );
        
        setGradingResult(graded);
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
          alert('Error memproses gambar: ' + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        if (!isCancelled) setIsProcessing(false);
      }
    }

    runPipeline();

    return () => { isCancelled = true; };
  }, [imageUri, activeTemplate, activeAnswerKey]);

  const handleRetake = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (gradingResult) {
      await saveResult(gradingResult);
      // Navigate to the result details screen
      router.replace(`/results/${gradingResult.id}`);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.image} 
            resizeMode="contain" 
          />
        ) : (
          <Text style={{color: '#fff'}}>Tidak ada gambar</Text>
        )}

        {isProcessing && (
          <View style={styles.overlay}>
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={Colors.primary[500]} />
              <Text style={styles.processingText}>Menganalisis Jawaban...</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button 
          mode="outlined" 
          onPress={handleRetake} 
          style={styles.button}
          disabled={isProcessing}
        >
          Foto Ulang
        </Button>
        <Button 
          mode="contained" 
          onPress={handleConfirm} 
          style={[styles.button, styles.confirmButton]}
          disabled={isProcessing || !gradingResult}
        >
          Lanjut Review
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  processingBox: { backgroundColor: '#fff', padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  processingText: { marginTop: Spacing.md, fontWeight: 'bold', color: Colors.neutral[800] },
  footer: { flexDirection: 'row', padding: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.neutral[900], gap: Spacing.md },
  button: { flex: 1, paddingVertical: 4 },
  confirmButton: { backgroundColor: Colors.accent[500] },
});
