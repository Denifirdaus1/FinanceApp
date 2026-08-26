import { router } from 'expo-router';

import { VoiceCommandWireframe } from '../../src/screens/voice/voice-command-wireframe';

export default function VoiceCaptureScreen() {
  return (
    <VoiceCommandWireframe
      onBack={() => router.back()}
      onOpenManualEntry={() => router.push('/capture')}
    />
  );
}
