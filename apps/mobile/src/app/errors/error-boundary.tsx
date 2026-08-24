import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

function BoundaryFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.title}>Terjadi kesalahan</Text>
      <Text style={styles.message}>Data Anda tetap aman di perangkat.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coba lagi"
        onPress={onRetry}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  override state: GlobalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(): void {}

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return <BoundaryFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF9F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2F241C',
  },
  message: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    color: '#67584A',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: '#7A5C3E',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFDF8',
  },
});
