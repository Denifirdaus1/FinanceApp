import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, useTheme as useUiTheme } from '@financeapp/ui';

import { ThemeProvider } from '../providers/theme-provider';

export interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

function BoundaryFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <ThemeProvider>
      <BoundaryFallbackContent onRetry={onRetry} />
    </ThemeProvider>
  );
}

function BoundaryFallbackContent({ onRetry }: { onRetry: () => void }) {
  const { tokens } = useUiTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading2, styles.title, { color: tokens.colors.textPrimary }]}
      >
        Terjadi kesalahan
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.message,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Data Anda tetap aman di perangkat.
      </Text>
      <Button label="Coba lagi" onPress={onRetry} style={{ marginTop: tokens.spacing.space6 }} />
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
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
