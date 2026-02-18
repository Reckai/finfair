import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { CategoryItem } from './CategoryItem';

interface CategoryGridProps {
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = useAppStore((s) => s.categories);
  const handleSelectCategory = useCallback((categoryId: number) => {
    onSelectCategory(categoryId);
  }, [onSelectCategory]);
  return (
    <View style={styles.container}>
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
         <CategoryItem key={category.id} category={category} isSelected={isSelected} onPress={handleSelectCategory} />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
