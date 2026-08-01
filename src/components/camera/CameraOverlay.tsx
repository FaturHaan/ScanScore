import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../../constants/theme';

interface CameraOverlayProps {
  isAligned: boolean;
  message?: string;
  foundMarkers: number;
}

export function CameraOverlay({ isAligned, message = 'Posisikan kertas di dalam bingkai', foundMarkers = 0 }: CameraOverlayProps) {
  const { width, height } = Dimensions.get('window');
  
  // Calculate viewfinder box (A4 proportion roughly)
  const boxWidth = width * 0.85;
  const boxHeight = boxWidth * 1.414; // A4 aspect ratio 1:sqrt(2)
  
  const boxLeft = (width - boxWidth) / 2;
  const boxTop = (height - boxHeight) / 2;

  const color = isAligned ? Colors.accent[400] : Colors.primary[400];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dimmed background around the box */}
      <View style={[styles.dimmer, { top: 0, left: 0, right: 0, height: boxTop }]} />
      <View style={[styles.dimmer, { top: boxTop, bottom: 0, left: 0, width: boxLeft }]} />
      <View style={[styles.dimmer, { top: boxTop, bottom: 0, right: 0, width: boxLeft }]} />
      <View style={[styles.dimmer, { top: boxTop + boxHeight, bottom: 0, left: boxLeft, right: boxLeft }]} />

      {/* Center Box with corner brackets */}
      <View
        style={[
          styles.viewfinder,
          {
            left: boxLeft,
            top: boxTop,
            width: boxWidth,
            height: boxHeight,
            borderColor: color,
          }
        ]}
      >
        <Corner position="top-left" color={color} />
        <Corner position="top-right" color={color} />
        <Corner position="bottom-left" color={color} />
        <Corner position="bottom-right" color={color} />
      </View>

      {/* Status Text */}
      <View style={[styles.messageContainer, { top: boxTop - 60 }]}>
        <View style={styles.badge}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
        <Text style={styles.markersText}>Markers: {foundMarkers}/4</Text>
      </View>
    </View>
  );
}

const Corner = ({ position, color }: { position: string; color: string }) => {
  const size = 30;
  const thickness = 4;
  
  let posStyle: any = {};
  if (position === 'top-left') {
    posStyle = { top: -2, left: -2, borderTopWidth: thickness, borderLeftWidth: thickness };
  } else if (position === 'top-right') {
    posStyle = { top: -2, right: -2, borderTopWidth: thickness, borderRightWidth: thickness };
  } else if (position === 'bottom-left') {
    posStyle = { bottom: -2, left: -2, borderBottomWidth: thickness, borderLeftWidth: thickness };
  } else if (position === 'bottom-right') {
    posStyle = { bottom: -2, right: -2, borderBottomWidth: thickness, borderRightWidth: thickness };
  }

  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderColor: color,
        },
        posStyle
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dimmer: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  viewfinder: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  messageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  markersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
