import React, { useEffect } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../types';

/** Format an ISO UTC string as Cyprus local time */
function formatCyprusTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Nicosia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function NotificationItem({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }) {
  return (
    <TouchableOpacity
      style={[s.item, item.read && s.itemRead]}
      onPress={() => !item.read && onRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[s.dot, item.read && s.dotRead]} />
      <View style={s.itemContent}>
        <Text style={s.itemTitle} numberOfLines={1}>{item.eventTitle}</Text>
        <Text style={s.itemText}>{item.text}</Text>
        <Text style={s.itemTime}>{formatCyprusTime(item.sentAt)}</Text>
      </View>
      <MaterialCommunityIcons
        name={item.type === '24h' ? 'clock-alert-outline' : 'bell-ring-outline'}
        size={22}
        color={item.read ? '#bbb' : '#3B7D7A'}
      />
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { notifications, markRead, markAllRead, refresh, unreadCount } = useNotifications();

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={s.readAllBtn}>
            <Text style={s.readAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="bell-off-outline" size={56} color="#ccc" />
          <Text style={s.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onRead={markRead} />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111' },
  readAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  readAllText: { fontSize: 13, fontWeight: '600', color: '#3B7D7A' },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4F4',
    borderRadius: 14,
    padding: 14,
  },
  itemRead: { backgroundColor: '#F7F7F7' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B7D7A',
    marginRight: 12,
    flexShrink: 0,
  },
  dotRead: { backgroundColor: '#ccc' },
  itemContent: { flex: 1, marginRight: 10 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 4 },
  itemText: { fontSize: 13, color: '#333', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#888', marginTop: 4 },
  separator: { height: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#aaa', fontWeight: '600' },
});
