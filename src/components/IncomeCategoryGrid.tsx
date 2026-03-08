import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useIncomeCategories } from '../hooks/useIncomeCategories';

interface IncomeCategoryGridProps {
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const IncomeCategoryGrid: React.FC<IncomeCategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { data: categories, isLoading } = useIncomeCategories();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {categories?.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <IncomeCategoryItem
            key={category.id}
            name={category.name}
            iconName={category.iconName}
            color={category.color}
            isSelected={isSelected}
            onPress={() => onSelectCategory(category.id)}
          />
        );
      })}
    </View>
  );
};

interface IncomeCategoryItemProps {
  name: string;
  iconName: string;
  color: string;
  isSelected: boolean;
  onPress: () => void;
}

const IncomeCategoryItem: React.FC<IncomeCategoryItemProps> = ({
  name,
  iconName,
  color,
  isSelected,
  onPress,
}) => {
  const iconContainerStyle = useMemo(
    () => [
      styles.iconContainer,
      { backgroundColor: isSelected ? color : color + '20' },
    ],
    [color, isSelected],
  );

  return (
    <Pressable
      style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
      onPress={onPress}
    >
      <View style={iconContainerStyle}>
        <MaterialCommunityIcons
          name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={24}
          color={isSelected ? '#FFFFFF' : color}
        />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
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
