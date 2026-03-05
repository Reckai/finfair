import React, { useMemo } from 'react';
import { Category } from '../types';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { colors } from '../constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface CategoryItemProps {
  category: Category;
  isSelected: boolean;
  onPress: (categoryId: number) => void;
}

export const CategoryItem = ({ category, isSelected, onPress }: CategoryItemProps) => {
  const iconContainerDynamicStyle = useMemo(
    () => [
      styles.iconContainer,
      { backgroundColor: isSelected ? category.color : category.color + '20' },
    ],
    [category.color, isSelected],
  );

  return (
    <Pressable
      style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
      onPress={() => onPress(category.id)}
    >
      <View style={iconContainerDynamicStyle}>
        <MaterialCommunityIcons
          name={category.iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={24}
          color={isSelected ? '#FFFFFF' : category.color}
        />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: colors.primary,
  },
  categoryName: {
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
