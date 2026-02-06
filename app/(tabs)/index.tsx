import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getTodayDateString } from '@/services/dailyLogs';

function HabitCard({
  emoji,
  title,
  completed,
  onToggle,
}: {
  emoji: string;
  title: string;
  completed: boolean;
  onToggle: () => void;
}) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.93, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    Haptics.impactAsync(
      completed
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    onToggle();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.habitCard,
          {
            backgroundColor: completed ? colors.successLight : colors.card,
            borderColor: completed ? colors.success : colors.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.habitEmoji}>{emoji}</Text>
        <Text
          style={[
            styles.habitTitle,
            {
              color: completed ? colors.success : colors.text,
              textDecorationLine: completed ? 'line-through' : 'none',
              opacity: completed ? 0.7 : 1,
            },
          ]}
        >
          {title}
        </Text>
        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: completed ? colors.success : 'transparent',
              borderColor: completed ? colors.success : colors.border,
            },
          ]}
        >
          {completed && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { habits, isHabitCompletedToday, toggleHabit, loading } = useData();

  const today = getTodayDateString();
  const completedCount = habits.filter((h) => isHabitCompletedToday(h.id)).length;
  const totalCount = habits.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.date, { color: colors.text }]}>{formatDate()}</Text>
        </View>

        {totalCount > 0 && (
          <View style={[styles.progressSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {completedCount}/{totalCount}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              completed today
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.habitsSection}>
          {habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No habits yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Go to Options to add your first habit
              </Text>
            </View>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                emoji={habit.emoji}
                title={habit.title}
                completed={isHabitCompletedToday(habit.id)}
                onToggle={() => toggleHabit(habit.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  date: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  progressSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
  },
  progressText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  habitsSection: {
    gap: 12,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  habitEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  habitTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
