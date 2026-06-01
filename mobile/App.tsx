import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@services/api/queryClient';
import Navigation from '@app/Navigation';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Navigation />
    </QueryClientProvider>
  );
}
