import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@services/api/queryClient';
import Navigation from '@app/Navigation';
import { useAuthLogoutListener } from '@features/auth/store/authStore';

function AppContent() {
  useAuthLogoutListener();

  return (
    <>
      <StatusBar style="auto" />
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
