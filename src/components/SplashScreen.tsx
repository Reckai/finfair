import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="wallet-outline" size={80} color="#ffffff" />
      <Text style={styles.title}>FinFair</Text>
      <Text style={styles.subtitle}>Спільні витрати — просто</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
});
