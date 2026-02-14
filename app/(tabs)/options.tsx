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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useAppTheme } from '@/hooks/useAppTheme';

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

// Generate time options every 30 minutes from 6:00 AM to 11:30 PM
const TIME_OPTIONS: { hour: number; minute: number; label: string }[] = [];
for (let h = 6; h <= 23; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push({ hour: h, minute: m, label: formatTime(h, m) });
  }
}

const EMOJI_SUGGESTIONS = ['💪', '📚', '🧘', '💧', '🏃', '✍️', '🎵', '😴', '🥗', '🧹', '💊', '🌅'];
const MAX_HABITS = 4;

export default function OptionsScreen() {
  const { colors } = useAppTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const { habits, createHabit, editHabit, removeHabit, reminderHour, reminderMinute, updateReminderTime, loading } = useData();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit habit state
  const [editingHabit, setEditingHabit] = useState<{ id: string; title: string; emoji: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditModal = (habit: { id: string; title: string; emoji: string }) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditEmoji(habit.emoji);
  };

  const handleSaveEdit = async () => {
    if (!editingHabit) return;
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a habit title.');
      return;
    }
    if (!editEmoji.trim()) {
      Alert.alert('Error', 'Please select or enter an emoji.');
      return;
    }
    setSaving(true);
    try {
      await editHabit(editingHabit.id, editTitle.trim(), editEmoji.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingHabit(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update habit.');
    } finally {
      setSaving(false);
    }
  };

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data, including habits, history, and statistics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your data will be lost forever. There is no way to recover it.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (error: any) {
                      if (error.code === 'auth/requires-recent-login') {
                        Alert.alert(
                          'Re-authentication Required',
                          'For security, please sign out, sign back in, and try again.'
                        );
                      } else {
                        Alert.alert('Error', error.message || 'Failed to delete account.');
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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

        {/* Reminder Settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder</Text>
          <TouchableOpacity
            style={styles.reminderRow}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.reminderLabel, { color: colors.text }]}>
              Daily reminder at
            </Text>
            <View style={[styles.reminderTimeBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.reminderTimeText, { color: colors.accent }]}>
                {formatTime(reminderHour, reminderMinute)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Pick a time
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.modalClose, { color: colors.accent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={TIME_OPTIONS}
                keyExtractor={(item) => `${item.hour}-${item.minute}`}
                showsVerticalScrollIndicator={false}
                style={styles.timeList}
                renderItem={({ item }) => {
                  const isSelected = item.hour === reminderHour && item.minute === reminderMinute;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.timeOption,
                        {
                          backgroundColor: isSelected ? colors.accentLight : 'transparent',
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={async () => {
                        await updateReminderTime(item.hour, item.minute);
                        Haptics.selectionAsync();
                        setShowTimePicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          { color: isSelected ? colors.accent : colors.text },
                          isSelected && styles.timeOptionTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Edit Habit Modal */}
        <Modal
          visible={editingHabit !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setEditingHabit(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Edit Habit
                </Text>
                <TouchableOpacity onPress={() => setEditingHabit(null)}>
                  <Text style={[styles.modalClose, { color: colors.accent }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editForm}>
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
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={30}
                  autoFocus
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
                            editEmoji === emoji ? colors.accentLight : colors.background,
                          borderColor:
                            editEmoji === emoji ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setEditEmoji(emoji)}
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
                  value={editEmoji}
                  onChangeText={setEditEmoji}
                  maxLength={2}
                />

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.accent }]}
                  onPress={handleSaveEdit}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
                  <TouchableOpacity
                    style={styles.habitInfo}
                    onPress={() => openEditModal(habit)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                    <Text style={[styles.habitTitle, { color: colors.text }]}>
                      {habit.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openEditModal(habit)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.editButton}
                  >
                    <Text style={[styles.editText, { color: colors.accent }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
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

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteAccountText, { color: colors.textSecondary }]}>
            Delete Account
          </Text>
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  reminderTimeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reminderTimeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeList: {
    paddingHorizontal: 16,
  },
  timeOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  timeOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    fontWeight: '600',
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
  editForm: {
    paddingHorizontal: 24,
    gap: 12,
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
  habitInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  editButton: {
    marginRight: 16,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
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
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
