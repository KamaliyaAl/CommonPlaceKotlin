import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useEvents } from "../context/EventsContext";
import { api } from "../api";
import { Place } from "../types";

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { events } = useEvents();

  const [joinedEvents, setJoinedEvents] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const registrations = await api.getRegistrations(user.uid);
      const registeredIds = new Set(registrations.map((r: any) => r.eventId));
      const matched = events.filter(e => registeredIds.has(e.id));
      // Sort: upcoming first (by date), then past
      const now = new Date();
      const sorted = [...matched].sort((a, b) => {
        const da = new Date(a.startTime ?? a.date).getTime();
        const db = new Date(b.startTime ?? b.date).getTime();
        const aFuture = da >= now.getTime();
        const bFuture = db >= now.getTime();
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        return aFuture ? da - db : db - da;
      });
      setJoinedEvents(sorted);
    } catch {
      setJoinedEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, events]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const formatDate = (event: Place) => {
    const dateStr = event.startTime ?? event.date;
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Asia/Nicosia",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return event.date;
    }
  };

  const isUpcoming = (event: Place) => {
    const d = new Date(event.startTime ?? event.date).getTime();
    return d >= Date.now();
  };

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Joined Events</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#3B7D7A" />
        </View>
      ) : (
        <FlatList
          data={joinedEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={joinedEvents.length === 0 ? s.emptyWrap : s.list}
          ListEmptyComponent={
            !user ? (
              <Text style={s.emptyText}>Sign in to see your joined events</Text>
            ) : (
              <View style={s.emptyInner}>
                <MaterialCommunityIcons name="calendar-check-outline" size={52} color="#ccc" />
                <Text style={s.emptyText}>No joined events yet</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const upcoming = isUpcoming(item);
            return (
              <TouchableOpacity
                style={[s.card, !upcoming && s.cardPast]}
                onPress={() => navigation.navigate("EventDetails", { eventId: item.id })}
                activeOpacity={0.8}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={s.thumb} />
                ) : (
                  <View style={[s.thumb, s.thumbPlaceholder]}>
                    <MaterialCommunityIcons name="calendar" size={28} color="#aaa" />
                  </View>
                )}

                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[s.badge, upcoming ? s.badgeUpcoming : s.badgePast]}>
                      <Text style={s.badgeText}>{upcoming ? "Upcoming" : "Past"}</Text>
                    </View>
                  </View>
                  <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={s.cardMeta}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#888" />
                    <Text style={s.cardMetaText}>{formatDate(item)}</Text>
                    {item.price ? (
                      <>
                        <MaterialCommunityIcons name="currency-eur" size={14} color="#888" style={{ marginLeft: 10 }} />
                        <Text style={s.cardMetaText}>{item.price}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 90 },
  emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyInner: { alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, color: "#888", fontWeight: "600", textAlign: "center" },
  card: {
    flexDirection: "row",
    backgroundColor: "#F0F8F8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B7D7A",
  },
  cardPast: {
    backgroundColor: "#F7F7F7",
    borderLeftColor: "#ccc",
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111", flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: "#555", lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: "#888" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeUpcoming: { backgroundColor: "#DFF2F1" },
  badgePast: { backgroundColor: "#EFEFEF" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#3B7D7A" },
  backBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
