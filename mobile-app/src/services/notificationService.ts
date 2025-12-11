import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationData } from '../types';

// Configuración para notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('match-notifications', {
          name: 'Notificaciones de Matches',
          description: 'Notificaciones cuando te toca jugar un match',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });

        await Notifications.setNotificationChannelAsync('tournament-updates', {
          name: 'Actualizaciones de Torneos',
          description: 'Información importante sobre torneos',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // TODO: Configurar
      });

      this.pushToken = token.data;
      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async sendTokenToServer(token: string, userId: string): Promise<void> {
    try {
        const response = await fetch('https://smash-ban-stages.vercel.app/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authorization header
        },
        body: JSON.stringify({
          token,
          userId,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push token with server');
      }
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  async scheduleMatchNotification(notificationData: NotificationData): Promise<void> {
    if (notificationData.type === 'match_ready') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.message,
          data: notificationData.data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Inmediata
      });
    }
  }

  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  async clearNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  async scheduleTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Esta es una notificación de prueba',
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });
  }
}

export const notificationService = new NotificationService();