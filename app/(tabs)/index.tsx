import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useData } from '@/contexts/DataContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getTodayDateString } from '@/services/dailyLogs';
import { DailyLog } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Milestone Celebrations ──────────────────────────────────────────────

const MILESTONES = [7, 14, 30, 60, 100, 200, 365];
const MILESTONE_INFO: Record<number, { emoji: string; title: string; subtitle: string }> = {
  7:   { emoji: '🔥', title: '1 Week Streak!', subtitle: "You're building a habit" },
  14:  { emoji: '⚡', title: '2 Week Streak!', subtitle: 'Consistency is key' },
  30:  { emoji: '🏆', title: '30 Day Streak!', subtitle: 'A whole month! Incredible' },
  60:  { emoji: '💎', title: '60 Day Streak!', subtitle: 'Diamond-level dedication' },
  100: { emoji: '👑', title: '100 Days!', subtitle: "You're legendary" },
  200: { emoji: '🌟', title: '200 Days!', subtitle: 'Absolutely incredible' },
  365: { emoji: '🎯', title: '1 Year Streak!', subtitle: 'Unstoppable. Truly.' },
};

const CONFETTI_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316'];
const CONFETTI_COUNT = 50;

interface ConfettiPieceData {
  id: number;
  x: number;
  speed: number;
  wobbleAmp: number;
  wobbleFreq: number;
  rotation: number;
  color: string;
  size: number;
}

function generateConfettiPieces(): ConfettiPieceData[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: Math.random(),
    speed: 0.7 + Math.random() * 0.6,
    wobbleAmp: 20 + Math.random() * 40,
    wobbleFreq: 2 + Math.random() * 4,
    rotation: 360 + Math.random() * 720,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 8 + Math.random() * 6,
  }));
}

function ConfettiPiece({
  piece,
  progress,
}: {
  piece: ConfettiPieceData;
  progress: { value: number };
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const y = -50 + p * (SCREEN_HEIGHT + 100) * piece.speed;
    const x =
      piece.x * SCREEN_WIDTH +
      Math.sin(p * piece.wobbleFreq * Math.PI * 2) * piece.wobbleAmp;
    const rotate = p * piece.rotation;
    const opacity = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    return {
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: piece.size,
          height: piece.size * 0.6,
          backgroundColor: piece.color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

function CelebrationOverlay({
  milestone,
  onDismiss,
}: {
  milestone: number;
  onDismiss: () => void;
}) {
  const progress = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.5);
  const pieces = useRef(generateConfettiPieces()).current;
  const info = MILESTONE_INFO[milestone] || {
    emoji: '🎉',
    title: `${milestone} Day Streak!`,
    subtitle: 'Amazing!',
  };

  useEffect(() => {
    progress.value = withTiming(1, { duration: 3500, easing: Easing.linear });
    cardOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    cardScale.value = withDelay(
      300,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <TouchableOpacity
      style={celebrationStyles.overlay}
      activeOpacity={1}
      onPress={onDismiss}
    >
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} progress={progress} />
      ))}
      <Animated.View style={[celebrationStyles.card, cardStyle]}>
        <Text style={celebrationStyles.emoji}>{info.emoji}</Text>
        <Text style={celebrationStyles.title}>{info.title}</Text>
        <Text style={celebrationStyles.subtitle}>{info.subtitle}</Text>
        <Text style={celebrationStyles.dismiss}>Tap to dismiss</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateStreakFromLogs(logs: DailyLog[]): number {
  let streak = 0;
  const current = new Date();
  while (true) {
    const dateStr = formatDateStr(current);
    const log = logs.find((l) => l.date === dateStr);
    if ((log?.completedHabitIds?.length ?? 0) > 0) {
      streak++;
    } else {
      break;
    }
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

// ── Habit Card ──────────────────────────────────────────────────────────

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
  const { habits, isHabitCompletedToday, toggleHabit, todayLog, getLogsForRange, loading } = useData();

  const today = getTodayDateString();
  const completedCount = habits.filter((h) => isHabitCompletedToday(h.id)).length;
  const totalCount = habits.length;

  // ── Milestone celebration ──
  const [celebration, setCelebration] = useState<number | null>(null);
  const hasLoadedOnce = useRef(false);
  const prevAllDone = useRef(false);

  useEffect(() => {
    if (loading) return;
    const allDone = completedCount === totalCount && totalCount > 0;
    if (hasLoadedOnce.current && allDone && !prevAllDone.current) {
      checkMilestone();
    }
    prevAllDone.current = allDone;
    hasLoadedOnce.current = true;
  }, [completedCount, totalCount, loading]);

  const checkMilestone = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 400);
      const logs = await getLogsForRange(formatDateStr(start), formatDateStr(end));

      // Merge with real-time today log
      const allLogs = todayLog
        ? [...logs.filter((l) => l.date !== today), todayLog]
        : logs;

      const streak = calculateStreakFromLogs(allLogs);
      if (MILESTONES.includes(streak)) {
        const key = `milestone_${streak}_${today}`;
        const already = await AsyncStorage.getItem(key);
        if (!already) {
          await AsyncStorage.setItem(key, 'true');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCelebration(streak);
        }
      }
    } catch (e) {
      console.error('Milestone check failed:', e);
    }
  };

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
      {celebration !== null && (
        <CelebrationOverlay
          milestone={celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
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

const celebrationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  dismiss: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
