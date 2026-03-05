import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { CategoryItem } from './CategoryItem';

interface CategoryGridProps {
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = useAppStore((s) => s.categories);
  const [expandedParentId, setExpandedParentId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedCategory === null) {
      setExpandedParentId(null);
    }
  }, [selectedCategory]);

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat?.subcategories?.length) {
        setExpandedParentId(categoryId);
      } else {
        onSelectCategory(categoryId);
      }
    },
    [onSelectCategory, categories],
  );

  const expandedParent = categories.find((c) => c.id === expandedParentId);
  return (
    <View style={styles.container}>
      {expandedParentId !== null && (
        <Pressable
          style={styles.backButton}
          onPress={() => {
            onSelectCategory(null);
            setExpandedParentId(null);
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      )}
      {expandedParentId !== null
        ? expandedParent?.subcategories?.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <CategoryItem
                key={category.id}
                category={category}
                isSelected={isSelected}
                onPress={handleSelectCategory}
              />
            );
          })
        : categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <CategoryItem
                key={category.id}
                category={category}
                isSelected={isSelected}
                onPress={handleSelectCategory}
              />
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
