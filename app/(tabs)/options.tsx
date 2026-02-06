import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useAppTheme } from '@/hooks/useAppTheme';

const EMOJI_SUGGESTIONS = ['💪', '📚', '🧘', '💧', '🏃', '✍️', '🎵', '😴', '🥗', '🧹', '💊', '🌅'];
const MAX_HABITS = 4;

export default function OptionsScreen() {
  const { colors } = useAppTheme();
  const { user, signOut } = useAuth();
  const { habits, createHabit, removeHabit, loading } = useData();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddHabit = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a habit title.');
      return;
    }
    if (!newEmoji.trim()) {
      Alert.alert('Error', 'Please select or enter an emoji.');
      return;
    }
    if (habits.length >= MAX_HABITS) {
      Alert.alert('Limit Reached', `You can only have ${MAX_HABITS} active habits.`);
      return;
    }

    setAdding(true);
    try {
      await createHabit(newTitle.trim(), newEmoji.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewTitle('');
      setNewEmoji('');
      setShowAddForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add habit.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteHabit = (habitId: string, title: string) => {
    Alert.alert('Remove Habit', `Remove "${title}" from your habits?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeHabit(habitId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch (error: any) {
            Alert.alert('Error', 'Failed to remove habit.');
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Options</Text>

        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileEmail, { color: colors.text }]}>
                {user?.email || 'Unknown'}
              </Text>
              <Text style={[styles.profileSub, { color: colors.textSecondary }]}>
                {habits.length}/{MAX_HABITS} habits active
              </Text>
            </View>
          </View>
        </View>

        {/* Habits Management */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              My Habits
            </Text>
            {habits.length < MAX_HABITS && (
              <TouchableOpacity
                onPress={() => setShowAddForm(!showAddForm)}
                activeOpacity={0.7}
              >
                <Text style={[styles.addButton, { color: colors.accent }]}>
                  {showAddForm ? 'Cancel' : '+ Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddForm && (
            <View style={[styles.addForm, { borderColor: colors.border }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Habit name"
                placeholderTextColor={colors.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={30}
              />

              <Text style={[styles.emojiLabel, { color: colors.textSecondary }]}>
                Pick an emoji
              </Text>
              <View style={styles.emojiRow}>
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiOption,
                      {
                        backgroundColor:
                          newEmoji === emoji ? colors.accentLight : colors.background,
                        borderColor:
                          newEmoji === emoji ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setNewEmoji(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Or type a custom emoji"
                placeholderTextColor={colors.textSecondary}
                value={newEmoji}
                onChangeText={setNewEmoji}
                maxLength={2}
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={handleAddHabit}
                disabled={adding}
                activeOpacity={0.8}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Habit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {habits.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No habits yet. Tap &quot;+ Add&quot; to create one.
            </Text>
          ) : (
            <View style={styles.habitsList}>
              {habits.map((habit) => (
                <View
                  key={habit.id}
                  style={[styles.habitRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  <Text style={[styles.habitTitle, { color: colors.text }]}>
                    {habit.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteHabit(habit.id, habit.title)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.deleteText, { color: colors.danger }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: colors.danger }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          MicroMe v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addButton: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '500',
  },
  profileSub: {
    fontSize: 13,
    marginTop: 2,
  },
  addForm: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  emojiLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emojiOptionText: {
    fontSize: 20,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  habitsList: {
    gap: 0,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  habitEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  habitTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  signOutButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
