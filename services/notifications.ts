import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_NOTIFICATION_ID = 'daily-habit-reminder';
const FUTURE_REMINDER_PREFIX = 'daily-habit-reminder-future-';
const FUTURE_DAYS_COUNT = 7;

export const DEFAULT_REMINDER_HOUR = 20; // 8 PM
export const DEFAULT_REMINDER_MINUTE = 0;

const reminderContent = {
  title: "Don't forget your habits! ✨",
  body: "You still have habits to complete today. Keep your streak going!",
  sound: true as const,
};

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  return true;
}

export async function scheduleDailyReminder(
  hour: number = DEFAULT_REMINDER_HOUR,
  minute: number = DEFAULT_REMINDER_MINUTE
): Promise<void> {
  // Cancel all reminders (recurring + future individual) before scheduling
  await cancelAllReminders();

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: {
      ...reminderContent,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancel today's recurring reminder but schedule individual one-time
 * notifications for the next 7 days. This ensures the user still receives
 * notifications on future days even if they don't open the app.
 */
export async function cancelTodayAndKeepFutureReminders(
  hour: number = DEFAULT_REMINDER_HOUR,
  minute: number = DEFAULT_REMINDER_MINUTE
): Promise<void> {
  await cancelAllReminders();

  const now = new Date();

  for (let i = 1; i <= FUTURE_DAYS_COUNT; i++) {
    const futureDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      hour,
      minute,
      0
    );

    await Notifications.scheduleNotificationAsync({
      identifier: `${FUTURE_REMINDER_PREFIX}${i}`,
      content: {
        ...reminderContent,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: futureDate,
      },
    });
  }
}

/**
 * Cancel all reminders — both the recurring daily and any future individual ones.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);

  for (let i = 1; i <= FUTURE_DAYS_COUNT; i++) {
    await Notifications.cancelScheduledNotificationAsync(
      `${FUTURE_REMINDER_PREFIX}${i}`
    );
  }
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
}
