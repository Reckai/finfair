import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export const ConnectionStatusBar: React.FC = () => {
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingCount = useAppStore((s) => s.pendingOutboxCount);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Офлайн-режим{pendingCount > 0 ? ` (${pendingCount} в очереди)` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
