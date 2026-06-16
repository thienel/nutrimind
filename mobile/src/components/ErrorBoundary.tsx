import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, RefreshCcw } from "lucide-react-native";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      message: undefined,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={38} color="#EF4444" />
        </View>

        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.description}>
          The app ran into an unexpected error. Please try again.
        </Text>

        {this.state.message ? (
          <Text style={styles.errorMessage} numberOfLines={3}>
            {this.state.message}
          </Text>
        ) : null}

        <Pressable style={styles.retryBtn} onPress={this.handleRetry}>
          <RefreshCcw size={18} color="#FFFFFF" />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
  },
  errorMessage: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    marginBottom: 18,
  },
  retryBtn: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});