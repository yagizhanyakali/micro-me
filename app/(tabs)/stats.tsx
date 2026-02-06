import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { DailyLog } from '@/types';

const WEEKS_TO_SHOW = 16;
const DAYS_IN_WEEK = 7;
const CELL_SIZE = 14;
const CELL_GAP = 3;

function getDateRange(): { startDate: string; endDate: string; days: string[] } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - WEEKS_TO_SHOW * DAYS_IN_WEEK + 1);

  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return {
    startDate: days[0],
    endDate: days[days.length - 1],
    days,
  };
}

function calculateStreak(logs: DailyLog[], habitCount: number): number {
  if (habitCount === 0) return 0;

  const today = new Date();
  let streak = 0;
  const current = new Date(today);

  while (true) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const log = logs.find((l) => l.date === dateStr);
    const completedCount = log?.completedHabitIds?.length ?? 0;

    // A "complete" day means at least 1 habit was done
    if (completedCount > 0) {
      streak++;
    } else {
      // Allow today to be incomplete without breaking streak
      if (streak === 0 && dateStr === formatDate(today)) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      break;
    }
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function HeatmapGrid({
  days,
  logsMap,
  habitCount,
}: {
  days: string[];
  logsMap: Map<string, DailyLog>;
  habitCount: number;
}) {
  const { colors } = useAppTheme();

  const getColor = (date: string) => {
    if (habitCount === 0) return colors.heatmap0;
    const log = logsMap.get(date);
    const completed = log?.completedHabitIds?.length ?? 0;
    const ratio = completed / habitCount;

    if (ratio === 0) return colors.heatmap0;
    if (ratio <= 0.25) return colors.heatmap1;
    if (ratio <= 0.5) return colors.heatmap2;
    if (ratio <= 0.75) return colors.heatmap3;
    return colors.heatmap4;
  };

  // Pad beginning to align to week start (Sunday)
  const firstDay = new Date(days[0]);
  const startDayOfWeek = firstDay.getDay();
  const paddedDays = [...Array(startDayOfWeek).fill(null), ...days];

  // Organize into weeks (columns)
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.dayLabelsColumn}>
        {dayLabels.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.dayLabel,
              { color: colors.textSecondary, height: CELL_SIZE, lineHeight: CELL_SIZE },
            ]}
          >
            {i % 2 === 1 ? label : ''}
          </Text>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridRow}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.gridColumn}>
              {week.map((day, di) => (
                <View
                  key={`${wi}-${di}`}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: day ? getColor(day) : 'transparent',
                      borderRadius: 3,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { habits, todayLog, getLogsForRange } = useData();

  const [pastLogs, setPastLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { startDate, endDate, days } = useMemo(() => getDateRange(), []);
  const today = useMemo(() => formatDate(new Date()), []);

  // Only fetch past logs from DB (excludes today). Runs once on focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchLogs() {
        setLoading(true);
        try {
          // Fetch up to yesterday only — today comes from local state
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = formatDate(yesterday);
          const data = await getLogsForRange(startDate, yesterdayStr);
          if (!cancelled) setPastLogs(data);
        } catch (err) {
          console.error('Failed to fetch logs:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchLogs();
      return () => { cancelled = true; };
    }, [startDate, getLogsForRange])
  );

  // Merge past logs (from DB) with today's log (from local real-time state)
  const allLogs = useMemo(() => {
    const merged = [...pastLogs];
    if (todayLog) {
      merged.push(todayLog);
    }
    return merged;
  }, [pastLogs, todayLog]);

  const logsMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    allLogs.forEach((l) => map.set(l.date, l));
    return map;
  }, [allLogs]);

  const streak = useMemo(
    () => calculateStreak(allLogs, habits.length),
    [allLogs, habits.length]
  );

  const totalCompletions = useMemo(() => {
    return allLogs.reduce((sum, l) => sum + (l.completedHabitIds?.length ?? 0), 0);
  }, [allLogs]);

  const activeDays = useMemo(() => {
    return allLogs.filter((l) => (l.completedHabitIds?.length ?? 0) > 0).length;
  }, [allLogs]);

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
        <Text style={[styles.title, { color: colors.text }]}>Stats</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              day streak
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>
              {totalCompletions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              completions
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>
              {activeDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              active days
            </Text>
          </View>
        </View>

        <View style={[styles.heatmapSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Activity
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Last {WEEKS_TO_SHOW} weeks
          </Text>
          <HeatmapGrid days={days} logsMap={logsMap} habitCount={habits.length} />
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Less
            </Text>
            {[colors.heatmap0, colors.heatmap1, colors.heatmap2, colors.heatmap3, colors.heatmap4].map(
              (color, i) => (
                <View
                  key={i}
                  style={[styles.legendCell, { backgroundColor: color }]}
                />
              )
            )}
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              More
            </Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heatmapSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  heatmapContainer: {
    flexDirection: 'row',
  },
  dayLabelsColumn: {
    marginRight: 6,
    gap: CELL_GAP,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    width: 14,
    textAlign: 'right',
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  gridColumn: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 16,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    marginHorizontal: 2,
  },
});
