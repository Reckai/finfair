import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveIconName } from '../constants/categories';
import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';

interface CategoryGridProps {
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = useAppStore((s) => s.categories);

  return (
    <View style={styles.container}>
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const iconName = resolveIconName(category.iconName);
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              isSelected && styles.categoryItemSelected,
            ]}
            onPress={() => onSelectCategory(category.id)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: category.color + '20' },
                isSelected && { backgroundColor: category.color },
              ]}
            >
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isSelected ? '#FFFFFF' : category.color}
              />
            </View>
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected,
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
