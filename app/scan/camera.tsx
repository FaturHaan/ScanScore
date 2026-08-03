import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';

import { CameraOverlay } from '../../src/components/camera/CameraOverlay';
import { processAnswerSheet, quickMarkerCheck } from '../../src/cv/pipeline';
import { RGBAImage } from '../../src/cv/preprocessor';
import { createDefaultTemplate } from '../../src/constants/template-defaults';
import { Colors } from '../../src/constants/theme';
import { useTemplateStore } from '../../src/store/template-store';
import * as FileSystem from 'expo-file-system';

export default function CameraScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundMarkers, setFoundMarkers] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  const { activeTemplate } = useTemplateStore();

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  if (!activeTemplate) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Format Lembar Jawaban belum ditentukan.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Aplikasi memerlukan akses kamera untuk memindai lembar jawaban.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) throw new Error("Failed to capture image");
      
      // Navigate to preview immediately with the captured photo
      // For now, we'll pass the uri via router params
      router.push({
        pathname: '/scan/preview',
        params: { imageUri: photo.uri }
      });
      
    } catch (error) {
      console.error(error);
      alert('Gagal mengambil gambar. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        ref={cameraRef}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <IconButton
              icon="close"
              iconColor="#fff"
              size={28}
              onPress={() => router.back()}
              style={styles.iconButton}
            />
            <IconButton
              icon="flash"
              iconColor="#fff"
              size={24}
              onPress={() => {}}
              style={styles.iconButton}
            />
          </View>

          <CameraOverlay 
            isAligned={foundMarkers === 4}
            foundMarkers={foundMarkers}
            message={
              foundMarkers === 4 
                ? "Siap dipindai!" 
                : "Posisikan 4 sudut kertas di dalam bingkai"
            }
          />

          <View style={styles.footer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.primary[500]} />
                <Text style={styles.processingText}>Memproses...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.captureButton, foundMarkers === 4 && styles.captureButtonReady]} 
                onPress={handleCapture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  footer: {
    padding: 30,
    paddingBottom: 50,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  captureButtonReady: {
    borderColor: Colors.accent[400],
    backgroundColor: 'rgba(16, 185, 129, 0.3)', // Emerald
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  processingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 12,
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary[500],
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 40,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
