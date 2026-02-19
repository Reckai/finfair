# FinFair -- Code Review Report

> React Native (Expo 54) best practices review based on vercel-react-native-skills.
> Дата: 2026-02-15

---

## Содержание

1. [Списки, производительность рендеринга и изображения](#1-списки-производительность-рендеринга-и-изображения)
2. [Навигация, экраны и модалки](#2-навигация-экраны-и-модалки)
3. [State Management и данные](#3-state-management-и-данные)
4. [UI-компоненты и стилизация](#4-ui-компоненты-и-стилизация)
5. [Сервисный слой, конфигурация и утилиты](#5-сервисный-слой-конфигурация-и-утилиты)
6. [Общая сводка](#6-общая-сводка)

---

## 1. Списки, производительность рендеринга и изображения

**Правила:** list-performance-flashlist, list-performance-keyextractor, list-performance-stable-callbacks, list-performance-getitemlayout, rendering-memo, rendering-no-inline-styles, rendering-no-anonymous-callbacks, rendering-text-in-text-component, rendering-no-falsy-and, ui-expo-image, ui-pressable, ui-styling

### Критические проблемы

### 1.1 FlatList вместо FlashList в HistoryScreen
- **Файл:** `src/screens/HistoryScreen.tsx:102`
- **Проблема:** Используется стандартный `FlatList` из React Native. `FlashList` от Shopify обеспечивает значительно более высокую производительность за счет переиспользования ячеек (recycling). На длинных списках транзакций разница будет заметна.
- **Best Practice:** `list-performance-flashlist` -- предпочитать FlashList вместо FlatList.
- **Рекомендация:** Установить `@shopify/flash-list` и заменить `FlatList` на `FlashList`. Обязательно указать `estimatedItemSize`:
```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={filteredTransactions}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  estimatedItemSize={80}
  contentContainerStyle={styles.list}
  ListEmptyComponent={renderEmpty}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

### 1.2 console.log оставлен в продакшен-коде DashboardScreen
- **Файл:** `src/screens/DashboardScreen.tsx:29`
- **Проблема:** `console.log(stats)` вызывается на каждом рендере компонента вне `useEffect`. Это засоряет логи и на каждом рендере сериализует весь объект `stats`, создавая нагрузку на JS-поток.
- **Best Practice:** Общая гигиена производительности рендеринга.
- **Рекомендация:** Удалить `console.log(stats)` со строки 29.

### Важные улучшения

### 1.3 renderItem в HistoryScreen не стабилизирован через useCallback
- **Файл:** `src/screens/HistoryScreen.tsx:58-70`
- **Проблема:** Функция `renderItem` объявлена как обычная функция внутри компонента и пересоздается при каждом рендере. Также она замыкает `getSplitLabel`, которая тоже пересоздается. Это приводит к перерисовке всех видимых элементов при каждом рендере родителя.
- **Best Practice:** `list-performance-stable-callbacks` -- колбэки в списках должны быть стабильными (useCallback).
- **Рекомендация:**
```tsx
const getSplitLabel = useCallback((tx: Transaction): string | null => {
  if (tx.splitMode === 'PARTNER') {
    return tx.userId === currentUserId ? 'Подарок' : 'Мне оплатили';
  }
  if (tx.splitMode === 'HALF') return 'Пополам';
  return null;
}, [currentUserId]);

const renderItem = useCallback(({ item }: { item: Transaction }) => {
  const label = getSplitLabel(item);
  return (
    <View style={label ? styles.debtTransactionWrapper : undefined}>
      <TransactionCard transaction={item} />
      {label && (
        <View style={styles.debtIndicator}>
          <Text style={styles.debtIndicatorText}>{label}</Text>
        </View>
      )}
    </View>
  );
}, [getSplitLabel]);
```

### 1.4 TransactionCard не обернут в React.memo
- **Файл:** `src/components/TransactionCard.tsx:14-51`
- **Проблема:** Компонент рендерится в списке (FlatList в HistoryScreen, `.map()` в DashboardScreen). Без `React.memo` каждый рендер родительского компонента вызовет повторный рендер всех карточек, даже если пропсы не изменились.
- **Best Practice:** `rendering-memo` -- использовать React.memo для чистых компонентов, особенно в списках.
- **Рекомендация:**
```tsx
export const TransactionCard: React.FC<TransactionCardProps> = React.memo(({
  transaction,
}) => {
  // ... существующий код ...
});
```

### 1.5 TouchableOpacity вместо Pressable
- **Файл:** `src/screens/HistoryScreen.tsx:84,92` и `src/components/CategoryGrid.tsx:25`
- **Проблема:** Используется `TouchableOpacity`. Компонент `Pressable` является современной рекомендуемой заменой -- более гибкий, поддержка `android_ripple`, стили по состоянию.
- **Best Practice:** `ui-pressable` -- использовать Pressable вместо TouchableOpacity.
- **Рекомендация:** Заменить `TouchableOpacity` на `Pressable` с функцией `style`.

### 1.6 Inline-стили с динамическим цветом на каждом рендере
- **Файл:** `src/components/TransactionCard.tsx:26`, `src/components/CategoryGrid.tsx:36-37`, `src/components/TrueSpendCard.tsx:104`
- **Проблема:** Объекты стилей `{ backgroundColor: category.color + '20' }` создаются заново при каждом рендере, что мешает оптимизациям React.
- **Best Practice:** `rendering-no-inline-styles` и `ui-styling`.
- **Рекомендация:** Использовать `useMemo` для кэширования стилей или вынести рендер элемента в отдельный мемоизированный компонент.

### 1.7 Анонимный колбэк onPress в CategoryGrid
- **Файл:** `src/components/CategoryGrid.tsx:31`
- **Проблема:** `onPress={() => onSelectCategory(category.id)}` создает новую анонимную функцию для каждого элемента при каждом рендере.
- **Best Practice:** `rendering-no-anonymous-callbacks`, `list-performance-stable-callbacks`.
- **Рекомендация:** Выделить элемент категории в отдельный мемоизированный компонент `CategoryItem` с `useCallback` для `onPress`.

### 1.8 Анонимные колбэки для фильтров в HistoryScreen
- **Файл:** `src/screens/HistoryScreen.tsx:86,94`
- **Проблема:** `onPress={() => setFilter('all')}` и `onPress={() => setFilter('debt')}` пересоздаются на каждый рендер.
- **Best Practice:** `rendering-no-anonymous-callbacks`.
- **Рекомендация:**
```tsx
const handleFilterAll = useCallback(() => setFilter('all'), []);
const handleFilterDebt = useCallback(() => setFilter('debt'), []);
```

### 1.9 Анонимный колбэк onClose для SettleUpModal
- **Файл:** `src/screens/DashboardScreen.tsx:105`
- **Проблема:** `onClose={() => setSettleModalVisible(false)}` пересоздается каждый рендер.
- **Best Practice:** `rendering-no-anonymous-callbacks`.
- **Рекомендация:** `const handleCloseSettleModal = useCallback(() => setSettleModalVisible(false), []);`

### 1.10 Список транзакций на DashboardScreen через .map() вместо FlashList
- **Файл:** `src/screens/DashboardScreen.tsx:96-98`
- **Проблема:** Транзакции рендерятся через `.map()` внутри `ScrollView` без виртуализации.
- **Best Practice:** `list-performance-flashlist`.
- **Рекомендация:** Если количеств о гарантированно мало (5-10), добавить `.slice(0, 5)`. Иначе заменить на FlashList.

### 1.11 getItemLayout не указан для FlatList
- **Файл:** `src/screens/HistoryScreen.tsx:102-112`
- **Проблема:** Без `getItemLayout` FlatList не может оптимизировать прокрутку к элементам.
- **Best Practice:** `list-performance-getitemlayout`.
- **Рекомендация:** Замерить высоту карточки и добавить `getItemLayout` или перейти на FlashList с `estimatedItemSize`.

### 1.12 Анонимная функция centerLabelComponent в PieChart
- **Файл:** `src/components/TrueSpendCard.tsx:66-71`
- **Проблема:** `centerLabelComponent={() => (...)}` пересоздается на каждый рендер.
- **Best Practice:** `rendering-no-anonymous-callbacks`.
- **Рекомендация:** Вынести в отдельный компонент или использовать `useCallback`.

### Предложения

### 1.13 chartData пересоздается при каждом рендере TrueSpendCard
- **Файл:** `src/components/TrueSpendCard.tsx:27-33`
- **Проблема:** Массив `chartData` вычисляется через `.map()` на каждый рендер.
- **Best Practice:** `rendering-memo`.
- **Рекомендация:** Обернуть в `useMemo`.

### 1.14 filteredTransactions не мемоизирован
- **Файл:** `src/screens/HistoryScreen.tsx:44-46`
- **Проблема:** Пересчитывается при каждом рендере, новая ссылка массива.
- **Best Practice:** `rendering-memo`.
- **Рекомендация:** `const filteredTransactions = useMemo(...)`

### 1.15 TrueSpendCard и CategoryGrid не обернуты в React.memo
- **Файл:** `src/components/TrueSpendCard.tsx:18`, `src/components/CategoryGrid.tsx:13`
- **Best Practice:** `rendering-memo`.
- **Рекомендация:** Обернуть оба компонента в `React.memo`.

### Что сделано хорошо

- **keyExtractor** в HistoryScreen использует уникальный `item.id` (не индекс).
- Все стили определены через `StyleSheet.create`.
- Текстовые строки корректно обернуты в `<Text>`.
- `ListEmptyComponent` с информативным сообщением.
- Pull-to-refresh с `RefreshControl` корректно реализован.
- `loadTransactions` стабилизирован через `useCallback`.

---

## 2. Навигация, экраны и модалки

**Правила:** navigation-types, navigation-deep-linking, navigation-header-config, navigation-tab-bar, ui-native-modals, ui-safe-area-scroll, ui-scrollview-content-inset

### Критические проблемы

### 2.1 Отсутствие типизации navigation props у экранов
- **Файл:** Все экраны (`AuthScreen.tsx:8`, `AddTransactionScreen.tsx:21`, `SettingsScreen.tsx:21`, `DashboardScreen.tsx:15`, `HistoryScreen.tsx:16`)
- **Проблема:** Все экраны объявлены как `React.FC` без параметров навигации. Типы `RootStackParamList` и `MainTabParamList` определены в `src/types/index.ts` (строки 89-99), но нигде не используются для типизации пропсов экранов. TypeScript не предоставит автодополнение и проверку типов для `navigation` и `route`.
- **Best Practice:** `navigation-types` -- Navigation props should be properly typed.
- **Рекомендация:** Типизировать каждый экран через `NativeStackScreenProps`/`BottomTabScreenProps` и добавить глобальную декларацию `ReactNavigation.RootParamList`.

### 2.2 Deep linking не интегрирован с NavigationContainer
- **Файл:** `App.tsx:50-77`, `src/navigation/AppNavigator.tsx:87`
- **Проблема:** Обработка deep link выполняется вручную через `Linking.addEventListener`, при этом `NavigationContainer` не получает конфигурацию `linking`. React Navigation имеет встроенную поддержку deep links.
- **Best Practice:** `navigation-deep-linking` -- Deep link configuration should be centralized and typed.
- **Рекомендация:** Создать централизованный `linking` объект и передать в `NavigationContainer`.

### 2.3 Потенциально небезопасное условие с не-булевым значением
- **Файл:** `src/screens/AddTransactionScreen.tsx:87`
- **Проблема:** Переменная `amount` (тип `string`) в условии `{!isFocused && !amount && (...)}` -- хрупкий паттерн с falsy-значениями строк.
- **Best Practice:** `rendering-no-falsy-and`.
- **Рекомендация:** Использовать `amount.length === 0` вместо `!amount`.

### Важные замечания

### 2.4 Повсеместное использование TouchableOpacity вместо Pressable
- **Файл:** `AuthScreen.tsx:62,78,89`, `AddTransactionScreen.tsx:134`, `SettingsScreen.tsx:158,163,187,202,222,241,246,275`, `SettleUpModal.tsx:73,78,81`, `HistoryScreen.tsx:84,92`
- **Проблема:** Все интерактивные элементы используют `TouchableOpacity` (устаревший API). `Pressable` -- рекомендуемый API.
- **Best Practice:** `ui-pressable`.
- **Рекомендация:** Заменить все `TouchableOpacity` на `Pressable` во всех файлах.

### 2.5 Анонимные функции в render (inline callbacks)
- **Файл:** `AddTransactionScreen.tsx:97-98`, `SettingsScreen.tsx:266-268`, `AuthScreen.tsx:91`, `DashboardScreen.tsx:105`
- **Проблема:** Множественные анонимные колбэки передаются как пропсы.
- **Best Practice:** `rendering-no-anonymous-callbacks`.
- **Рекомендация:** Вынести колбэки в `useCallback`.

### 2.6 Inline-стиль в SettingsScreen
- **Файл:** `src/screens/SettingsScreen.tsx:278`
- **Проблема:** `{ marginTop: 12 }` -- инлайн-объект стиля создается заново при каждом рендере.
- **Best Practice:** `rendering-no-inline-styles`.
- **Рекомендация:** Вынести в `StyleSheet`.

### 2.7 SettleUpModal: состояние amount не сбрасывается при открытии
- **Файл:** `src/components/SettleUpModal.tsx:26`
- **Проблема:** При переоткрытии модала `currentBalance` может измениться, но `useState` не обновит значение.
- **Best Practice:** Состояние модала должно синхронизироваться с входными данными при открытии.
- **Рекомендация:** Добавить `useEffect` для синхронизации при `visible` изменении.

### 2.8 Отсутствует обработка safe area в SettleUpModal
- **Файл:** `src/components/SettleUpModal.tsx:42-88`
- **Проблема:** `paddingBottom: 40` -- захардкоженное значение. На устройствах с home indicator контент может перекрываться.
- **Best Practice:** `ui-safe-area-scroll`.
- **Рекомендация:** Использовать `useSafeAreaInsets()` для динамического нижнего отступа.

### 2.9 ScrollView в AddTransactionScreen не обрабатывает content inset для клавиатуры
- **Файл:** `src/screens/AddTransactionScreen.tsx:81`
- **Проблема:** Отсутствуют `keyboardShouldPersistTaps="handled"` и `keyboardDismissMode`. Клавиатура может перекрыть кнопку "Добавить".
- **Best Practice:** `ui-scrollview-content-inset`.
- **Рекомендация:** Добавить `keyboardShouldPersistTaps`, увеличить нижний padding.

### 2.10 Отсутствует accessibility на tab bar
- **Файл:** `src/navigation/AppNavigator.tsx:20-57`
- **Проблема:** Нет свойств `tabBarAccessibilityLabel` для вкладок.
- **Best Practice:** `navigation-tab-bar`.
- **Рекомендация:** Добавить `tabBarAccessibilityLabel` в options каждого `Tab.Screen`.

### Предложения

### 2.11 Дублирование логики загрузки пары и категорий
- **Файл:** `App.tsx:31-39` и `App.tsx:55-62`
- **Проблема:** Код загрузки `pairsApi.me()` и `categoriesApi.getAll()` дублируется в `checkAuth` и `handleDeepLink`.
- **Рекомендация:** Вынести общую логику в отдельную функцию `initializeUserData`.

### 2.12 SplashScreen не использует SafeAreaView
- **Файл:** `src/components/SplashScreen.tsx:7`
- **Рекомендация:** Использовать `StatusBar` для согласования цвета.

### 2.13 Жёстко закодированная высота tab bar
- **Файл:** `src/navigation/AppNavigator.tsx:51`
- **Проблема:** `height: 60` не учитывает safe area на устройствах с home indicator.
- **Рекомендация:** Позволить React Navigation автоматически обрабатывать высоту.

### Что сделано хорошо

- Правильное использование `screenOptions`/`options` для конфигурации заголовков.
- Условная навигация для аутентификации через `isAuthenticated`.
- Использование нативного `Modal` в SettleUpModal.
- Корректная обработка клавиатуры на AuthScreen.
- Навигаторы типизированы дженериками `createNativeStackNavigator<RootStackParamList>()`.
- Корректная очистка подписки на deep link в cleanup `useEffect`.

---

## 3. State Management и данные

**Правила:** react-state-minimal-zustand-selectors, react-state-derived-not-stored, react-state-no-useeffect-sync, react-compiler-stable-references, react-state-batch-updates

### Критические проблемы

### 3.1 `isAuthenticated` -- производное состояние хранится в store
- **Файл:** `src/store/useAppStore.ts:10,39,60`
- **Проблема:** Поле `isAuthenticated` дублирует `user !== null`. Может рассинхронизироваться.
- **Best Practice:** `react-state-derived-not-stored`.
- **Рекомендация:** Удалить из state, заменить вычисляемым селектором: `useAppStore((s) => s.user !== null)`.

### 3.2 `getBalance` -- мёртвый код без мемоизации
- **Файл:** `src/store/useAppStore.ts:54-57`
- **Проблема:** `getBalance` нигде в компонентах не вызывается. Dashboard использует `stats?.balance` из API. Если бы использовался, при каждом рендере расчёт выполнялся бы заново.
- **Best Practice:** `react-state-derived-not-stored` + мертвый код.
- **Рекомендация:** Удалить из store. Если потребуется -- создать отдельный хук с `useMemo`.

### 3.3 `parseFloat` в адаптерах без валидации -- потенциальный NaN
- **Файл:** `src/utils/transactionAdapter.ts:18`, `src/utils/settlementAdapter.ts:8`
- **Проблема:** `parseFloat(apiTx.amount)` не проверяет результат на `NaN`. Невалидное значение тихо проникнет в расчёты и UI.
- **Best Practice:** Безопасная обработка данных на границе API.
- **Рекомендация:** Добавить `Number.isNaN()` проверку с fallback на 0.

### Важные улучшения

### 3.4 Дублирование логики расчёта в categoryCalculator и debtCalculator
- **Файл:** `src/utils/categoryCalculator.ts:18-32`, `src/utils/debtCalculator.ts:28-64`
- **Проблема:** Дублируется switch-логика определения `myExpense` по `splitMode` + `userId`.
- **Best Practice:** DRY.
- **Рекомендация:** Переиспользовать `calculateTransactionImpact` из `debtCalculator`.

### 3.5 Множественные вызовы useAppStore для экшенов
- **Файл:** `App.tsx:13-17`
- **Проблема:** 5 отдельных вызовов `useAppStore` для получения стабильных экшенов создают 5 подписок.
- **Best Practice:** `react-state-minimal-zustand-selectors`.
- **Рекомендация:** Объединить экшены через `useShallow`:
```ts
import { useShallow } from 'zustand/react/shallow';

const { setUser, setLoading, setPairId, setCategories } = useAppStore(
  useShallow((s) => ({
    setUser: s.setUser,
    setLoading: s.setLoading,
    setPairId: s.setPairId,
    setCategories: s.setCategories,
  }))
);
```

### 3.6 Отсутствие `updateTransaction` в store
- **Файл:** `src/store/useAppStore.ts`, `src/services/transactions.ts:34-40`
- **Проблема:** API поддерживает `update()`, но store не имеет экшена `updateTransaction`. Обновлённая транзакция не попадёт в store.
- **Рекомендация:** Добавить экшен `updateTransaction`.

### 3.7 `logout` не сбрасывает `isLoading` корректно
- **Файл:** `src/store/useAppStore.ts:101-102`
- **Проблема:** `set(initialState)` устанавливает `isLoading: true`. Пользователь может застрять на splash-экране.
- **Best Practice:** `react-state-batch-updates`.
- **Рекомендация:** `logout: () => set({ ...initialState, isLoading: false })`.

### 3.8 Тип AuthState не используется и дублирует store
- **Файл:** `src/types/index.ts:74-79`
- **Проблема:** Мёртвый интерфейс, расходящийся со store.
- **Рекомендация:** Удалить `AuthState`.

### 3.9 Falsy-проверки в transactionToCreatePayload
- **Файл:** `src/utils/transactionAdapter.ts:38-39`
- **Проблема:** `if (tx.description)` -- falsy-проверка для строковых полей.
- **Рекомендация:** Использовать `!== undefined && !== ''`.

### Предложения

### 3.10 categoryCalculator не используется нигде
- **Файл:** `src/utils/categoryCalculator.ts`
- **Проблема:** Мёртвый код -- Dashboard получает `categoryBreakdown` из API.
- **Рекомендация:** Удалить или пометить как кандидата на удаление.

### 3.11 Несогласованность null vs undefined между API и фронтенд типами
- **Файл:** `src/types/api.ts:13` vs `src/types/index.ts:37`
- **Проблема:** API использует `null`, фронтенд -- `undefined`. Адаптер конвертирует, но соглашение не задокументировано.
- **Рекомендация:** Добавить комментарий о конвенции в адаптер.

### 3.12 DashboardScreen дублирует данные: store settlement + локальный stats
- **Файл:** `src/screens/DashboardScreen.tsx:19-21`
- **Проблема:** Dashboard получает данные из двух источников, создавая рассинхронизацию.
- **Рекомендация:** Определиться с архитектурой: полностью серверный или полностью клиентский подход.

### Что сделано хорошо

- Гранулярные Zustand-селекторы `useAppStore((s) => s.field)` во всех компонентах.
- Чистая адаптерная прослойка `ApiTransaction` -> `Transaction`.
- Правильная типизация: `categoryId: number`, `SplitMode` union literal, нет `any`.
- Иммутабельные обновления в store (spread, `.filter()`, `.map()`).
- Разделение бизнес-логики в утилитах (`debtCalculator`, `categoryCalculator`).

---

## 4. UI-компоненты и стилизация

**Правила:** ui-styling, ui-pressable, ui-measure-views, rendering-text-in-text-component, rendering-no-falsy-and, rendering-no-inline-styles, rendering-no-anonymous-callbacks, rendering-memo, animation-reanimated

### Важные улучшения

### 4.1 TouchableOpacity используется вместо Pressable во всех компонентах
- **Файл:** `src/components/NetBalanceCard.tsx:2,43`, `src/components/OwnerToggle.tsx:2,26`, `src/components/CategoryGrid.tsx:2,25`
- **Проблема:** Во всех трёх компонентах -- `TouchableOpacity` (устаревший API). Во всём проекте `Pressable` не используется нигде (0 вхождений), а `TouchableOpacity` -- в 8 файлах.
- **Best Practice:** `ui-pressable`.
- **Рекомендация:** Миграция проекта целиком на `Pressable`.

### 4.2 Захардкоженные цвета в StyleSheet
- **Файл:** `src/components/NetBalanceCard.tsx:61,70,76,83`, `src/components/OwnerToggle.tsx:73`, `src/components/CategoryGrid.tsx:43`
- **Проблема:** Строковые литералы `'#FFFFFF'`, `'rgba(255, 255, 255, 0.8)'` и др. разбросаны по компонентам, хотя есть `colors.ts`.
- **Best Practice:** Все цвета должны быть централизованы.
- **Рекомендация:** Добавить недостающие цвета (`white`, `whiteTransparent80`, `whiteTransparent20`, `overlay50`) в `colors.ts`.

### 4.3 Анонимные колбэки в onPress внутри рендер-циклов
- **Файл:** `src/components/OwnerToggle.tsx:32`, `src/components/CategoryGrid.tsx:31`
- **Проблема:** Внутри `.map()` создаются анонимные стрелочные функции на каждый рендер для каждого элемента.
- **Best Practice:** `rendering-no-anonymous-callbacks`.
- **Рекомендация:** Вынести элементы в отдельные мемоизированные компоненты с `useCallback`.

### 4.4 Динамические inline-стили в JSX
- **Файл:** `src/components/NetBalanceCard.tsx:33`, `src/components/TransactionCard.tsx:26`, `src/components/CategoryGrid.tsx:36-37`
- **Проблема:** Объекты стилей создаются при каждом рендере.
- **Best Practice:** `rendering-no-inline-styles`, `ui-styling`.
- **Рекомендация:** Использовать `useMemo` для кэширования или определить статические варианты стилей в `StyleSheet`.

### 4.5 Отсутствие React.memo на чистых компонентах
- **Файл:** `src/components/TransactionCard.tsx:14`, `src/components/NetBalanceCard.tsx:12`, `src/components/OwnerToggle.tsx:12`
- **Проблема:** Ни один компонент не обёрнут в `React.memo`. Во всём проекте 0 вхождений `React.memo`.
- **Best Practice:** `rendering-memo`.
- **Рекомендация:** Обернуть все компоненты-карточки и элементы списков в `React.memo`.

### 4.6 Отсутствие атрибутов доступности (accessibility)
- **Файл:** `src/components/NetBalanceCard.tsx:43`, `src/components/OwnerToggle.tsx:26`, `src/components/CategoryGrid.tsx:25`
- **Проблема:** Ни в одном интерактивном элементе нет `accessibilityLabel`, `accessibilityRole`. В `src/components/` -- 0 вхождений accessibility-атрибутов. Приложение недоступно для скрин-ридеров.
- **Best Practice:** Все интерактивные элементы должны иметь accessibility-атрибуты.
- **Рекомендация:** Добавить `accessibilityRole="button"` и `accessibilityLabel` ко всем интерактивным элементам.

### Предложения

### 4.7 Потенциально опасный `&&` с `transaction.description`
- **Файл:** `src/components/TransactionCard.tsx:39`
- **Проблема:** `{transaction.description && (<Text>...)}` -- если `description` будет пустой строкой, React Native выбросит ошибку.
- **Best Practice:** `rendering-no-falsy-and`.
- **Рекомендация:** Использовать тернарный оператор.

### 4.8 Конкатенация строк для создания цветов с альфа-каналом
- **Файл:** `src/components/TransactionCard.tsx:26`, `src/components/CategoryGrid.tsx:36`
- **Проблема:** `category.color + '20'` -- хрупкий паттерн. При формате `rgb()`, `rgba()` или сокращённом HEX результат будет невалидным.
- **Рекомендация:** Создать утилитарную функцию `withOpacity(hexColor, opacity)`.

### 4.9 TransactionCard всегда показывает сумму со знаком минус
- **Файл:** `src/components/TransactionCard.tsx:48`
- **Проблема:** `-{formatCurrency(transaction.amount)}` захардкожено с минусом. Не все транзакции -- расход текущего пользователя.
- **Рекомендация:** Вычислять знак на основе `splitMode` и `userId`.

### Что сделано хорошо

- Цвета организованы по семантическим группам в `colors.ts`.
- Все компоненты используют `StyleSheet.create`.
- Чёткие TypeScript-интерфейсы для пропсов, нет `any`.
- Корректная обработка null-состояний в TransactionCard.
- Чёткое разделение ответственности между компонентами.

---

## 5. Сервисный слой, конфигурация и утилиты

**Правила:** imports-no-index, imports-platform-specific, fonts-config-plugin, js-hoist-intl

### Критические проблемы

### 5.1 Импорт из index-файла `../types` вместо прямого модуля
- **Файл:** `src/services/api.ts:3`, `src/services/auth.ts:3`, `src/services/pairs.ts:2`, `src/services/transactions.ts:3`, `src/services/settlements.ts:5`, `src/services/categories.ts:1`
- **Проблема:** 6 сервисных файлов импортируют через barrel-файл `../types/index.ts`. Замедляет Metro bundler, затрудняет tree-shaking.
- **Best Practice:** `imports-no-index`.
- **Рекомендация:** Импортировать напрямую из `../types/api.ts`, `../types/common.ts` и т.д.

### 5.2 Отсутствие timeout в Axios-клиенте
- **Файл:** `src/services/api.ts:13-18`
- **Проблема:** Запросы будут висеть бесконечно при отсутствии ответа сервера.
- **Best Practice:** Все HTTP-клиенты должны иметь явный timeout (10-15 секунд для мобильных).
- **Рекомендация:** Добавить `timeout: 15000` в конфигурацию `axios.create()`.

### 5.3 401-обработка не вызывает logout в стейт-менеджере
- **Файл:** `src/services/api.ts:36-39`
- **Проблема:** Interceptor очищает токен, но не сбрасывает Zustand-store. Приложение остается визуально "аутентифицированным".
- **Best Practice:** Полноценная обработка 401: токен + стейт + навигация.
- **Рекомендация:** Добавить callback `onUnauthorized` для уведомления слоя приложения.

### 5.4 Дублирование URL Telegram-бота
- **Файл:** `src/services/auth.ts:5` и `src/services/auth.ts:20`
- **Проблема:** Константа `TELEGRAM_BOT_URL` объявлена, но не используется -- URL захардкожен повторно на строке 20. Баг copy-paste.
- **Best Practice:** Magic strings должны быть централизованы.
- **Рекомендация:** Использовать константу `TELEGRAM_BOT_URL`.

### 5.5 Дублирование логики loginWithToken и handleAuthCallback
- **Файл:** `src/services/auth.ts:28-36` и `src/services/auth.ts:41-58`
- **Проблема:** Идентичный код обмена токена в двух местах (нарушение DRY).
- **Рекомендация:** `handleAuthCallback` должен вызывать `loginWithToken`.

### Важные замечания

### 5.6 `toLocaleString('ru-RU')` ненадежен в React Native
- **Файл:** `src/utils/formatters.ts:8`
- **Проблема:** JSC на Android не поддерживает полноценную Intl-локализацию. Результат может быть `"1234.56"` вместо `"1 234,56"`.
- **Best Practice:** `js-hoist-intl`.
- **Рекомендация:** Использовать ручное форматирование или hoisted `Intl.NumberFormat`.

### 5.7 Сервисы молча проглатывают ошибки API
- **Файл:** `src/services/transactions.ts:11-12,19-20`, `src/services/settlements.ts:14-15`, `src/services/categories.ts:16`, `src/services/dashboard.ts:10`
- **Проблема:** При ошибке API возвращается `[]` или `null`. Вызывающий код не получает информации об ошибке.
- **Best Practice:** Ошибки должны пробрасываться или возвращаться в Result-типе.
- **Рекомендация:** Использовать паттерн Result или throw typed errors.

### 5.8 Небезопасный type assertion `as string`
- **Файл:** `src/services/auth.ts:48`
- **Проблема:** `queryParams.token as string` замаскирует случай, когда `token` -- массив строк.
- **Best Practice:** Избегать `as` assertions, использовать runtime-проверки.
- **Рекомендация:** `Array.isArray(rawToken) ? rawToken[0] : rawToken`.

### 5.9 Fallback URL бэкенда -- приватный IP-адрес
- **Файл:** `src/services/api.ts:5`
- **Проблема:** `'http://192.168.0.187:3000'` -- приватный IP. В production -- гарантированная ошибка. `http://` без TLS заблокирован на iOS (ATS).
- **Best Practice:** Конфигурация через environment variables без опасных fallback.
- **Рекомендация:** Бросать ошибку при отсутствии `EXPO_PUBLIC_API_URL`. Создать `.env.example`.

### 5.10 Несогласованные контракты сервисов: chartDataApi и pairsApi
- **Файл:** `src/services/chartData.ts:5`, `src/services/pairs.ts:5-8`
- **Проблема:** Возвращают сырой `ApiResponse<T>` вместо развернутых данных, в отличие от остальных сервисов.
- **Best Practice:** Единый контракт сервисного слоя.
- **Рекомендация:** Привести к паттерну `data | null`.

### 5.11 Несогласованность стиля импортов
- **Файл:** `src/services/categories.ts:1`
- **Проблема:** Смешанный паттерн: одни сервисы импортируют из index, другие из конкретных файлов.
- **Рекомендация:** Единообразный подход к импортам.

### Предложения

### 5.12 Отсутствие `.env.example`
- **Файл:** корень проекта
- **Рекомендация:** Создать `.env.example` с описанием всех переменных окружения.

### 5.13 date-fns locale дублируется в каждом вызове
- **Файл:** `src/utils/formatters.ts:1-2,16,24,32,40`
- **Рекомендация:** Использовать `setDefaultOptions({ locale: ru })` из date-fns v4.

### 5.14 `iconMap` использует `Record<string, string>` вместо строгой типизации
- **Файл:** `src/constants/categories.ts:8`
- **Рекомендация:** Использовать `as const` + union type.

### 5.15 categoriesApi дублирует identity-маппинг
- **Файл:** `src/services/categories.ts:8-14`
- **Проблема:** Типы `ApiCategory` и `Category` идентичны. Маппинг не делает преобразования.
- **Рекомендация:** Убрать ненужный маппинг.

### 5.16 tsconfig.json не задает path aliases
- **Файл:** `tsconfig.json`
- **Рекомендация:** Добавить `"paths": { "@/*": ["./src/*"] }`.

### 5.17 handleAuthCallback не используется
- **Файл:** `src/services/auth.ts:41-58`
- **Проблема:** Мертвый код.
- **Рекомендация:** Удалить или подключить в deep link listener.

### 5.18 app.json: отсутствие intent filter для Android deep links
- **Файл:** `app.json:20-29`
- **Рекомендация:** Добавить `intentFilters` в секцию `android`.

### Что сделано хорошо

- Паттерн адаптеров `transactionAdapter.ts`/`settlementAdapter.ts` -- чёткая граница API/frontend.
- Класс `ApiService` с единой точкой обработки ошибок и generics.
- Доменное разделение сервисов (transactions, settlements, pairs, categories, dashboard, auth).
- Безопасное хранение JWT в `expo-secure-store`.
- Форматтеры как чистые функции, без побочных эффектов.
- Централизованный маппинг иконок `resolveIconName()`.

---

## 6. Общая сводка

### Статистика по приоритетам

| Область | Критические | Важные | Предложения | Хорошие паттерны |
|---------|:-----------:|:------:|:-----------:|:----------------:|
| 1. Списки и производительность | 2 | 10 | 3 | 6 |
| 2. Навигация и экраны | 3 | 7 | 3 | 6 |
| 3. State Management | 3 | 6 | 3 | 5 |
| 4. UI-компоненты | 0 | 6 | 3 | 5 |
| 5. Сервисы и конфигурация | 5 | 6 | 7 | 6 |
| **Итого** | **13** | **35** | **19** | **28** |

### Топ-10 приоритетных исправлений

1. **`console.log(stats)`** (`DashboardScreen.tsx:29`) -- удалить отладочный код
2. **Timeout в Axios** (`api.ts:13-18`) -- быстрое исправление, высокий impact на UX
3. **401 logout** (`api.ts:36-39`) -- без этого приложение "зависает" в невалидном состоянии
4. **Дублирование URL бота** (`auth.ts:5,20`) -- баг, сломает работу при попытке изменить URL
5. **FlatList -> FlashList** (`HistoryScreen.tsx:102`) -- ощутимый прирост производительности
6. **React.memo на TransactionCard** (`TransactionCard.tsx:14`) -- быстрое улучшение рендеринга списков
7. **parseFloat без NaN-проверки** (`transactionAdapter.ts:18`) -- потенциальный "NaN ₴" в UI
8. **isAuthenticated как derived state** (`useAppStore.ts:10`) -- потенциальная рассинхронизация
9. **TouchableOpacity -> Pressable** (8 файлов) -- миграция на рекомендуемый API
10. **Типизация navigation props** (все экраны) -- типобезопасность навигации

### Системные паттерны, требующие внимания

- **0 вхождений `React.memo`** во всём проекте
- **0 вхождений `Pressable`** -- 100% использование устаревшего `TouchableOpacity`
- **0 accessibility-атрибутов** в компонентах
- **Несогласованные контракты сервисов** -- часть возвращает `ApiResponse<T>`, часть -- `data | null`
- **Дублирование бизнес-логики** -- расчёт split mode в двух калькуляторах
- **Мёртвый код** -- `getBalance`, `AuthState`, `categoryCalculator`, `handleAuthCallback`
