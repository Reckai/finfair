import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../constants/colors';
import { SplitMode } from '../types';

interface SplitModeToggleProps {
  value: SplitMode;
  onChange: (value: SplitMode) => void;
  partnerName: string;
}

export const SplitModeToggle: React.FC<SplitModeToggleProps> = ({
  value,
  onChange,
  partnerName,
}) => {
  const options: { key: SplitMode; label: string }[] = [
    { key: 'PERSONAL', label: 'Себя' },
    { key: 'HALF', label: 'Пополам' },
    { key: 'PARTNER', label: `${partnerName}` },
    { key: 'CUSTOM', label: 'Своё' },
  ];

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          style={[styles.option, value === option.key && styles.optionSelected]}
          onPress={() => onChange(option.key)}
        >
          <Text style={[styles.optionText, value === option.key && styles.optionTextSelected]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});
