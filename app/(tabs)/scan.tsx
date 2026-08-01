import { Redirect } from 'expo-router';

export default function ScanTab() {
  // Directly redirect to the camera scanner full screen
  // Since camera needs full screen and shouldn't be constrained by bottom tabs
  return <Redirect href="/scan/camera" />;
}
