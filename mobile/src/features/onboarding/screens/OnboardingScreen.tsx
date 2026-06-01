import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// TODO: UC-3.1.3 multi-step onboarding container
export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <Text>Onboarding (coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
