import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../auth/AuthContext";
import { Category, Place } from "../types";
import type { BottomTabParamList } from "../navigation/Tabs";
import { api } from "../api";

const CATEGORY_LABEL: Record<Category, string> = {
  food: "Food",
  sport: "Sport",
  nature: "Nature",
  culture: "Culture",
  other: "Other",
};

const formatTime = (isoString?: string | null) => {
  if (!isoString) return "?";
  if (!isoString.includes("T")) return isoString;
  const timePart = isoString.split("T")[1];
  if (!timePart) return "?";
  return timePart.slice(0, 5); // HH:mm
};

const getEventStatus = (event: Place) => {
  const now = Date.now();
  const start = new Date(event.startTime ?? event.date).getTime();
  const end = new Date(event.endTime ?? event.date).getTime();
  if (now < start) return "Upcoming";
  if (now > end) return "Past";
  return "Current";
};

export default function EventDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { events, toggleFavourite, isFavourite } = useEvents();
  const { user } = useAuth();

  const eventId: string | undefined = route?.params?.eventId;
  const event = useMemo(() => events.find(e => e.id === eventId), [events, eventId]);

  const [joined, setJoined] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loadingOrganizer, setLoadingOrganizer] = useState(false);

  // Load organizer profile
  useEffect(() => {
    const organizerId = event?.organizerId;
    if (!organizerId) { setOrganizer(null); return; }
    setLoadingOrganizer(true);
    api.getProfile(organizerId)
      .then(setOrganizer)
      .catch(() => setOrganizer(null))
      .finally(() => setLoadingOrganizer(false));
  }, [event?.organizerId]);

  // Load initial join state from backend
  useEffect(() => {
    if (!user?.uid || !eventId) return;
    api.getRegistrations(user.uid)
      .then(regs => setJoined(regs.some(r => r.eventId === eventId)))
      .catch(() => {});
  }, [user?.uid, eventId]);

  if (!event) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.title}>Event not found</Text>
        </View>
        {/* Bottom Back button styled like in FindScreen */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const onJoin = async () => {
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in to join events.");
      return;
    }
    if (joiningLoading) return;
    setJoiningLoading(true);
    try {
      if (joined) {
        await api.unjoinEvent(user.uid, event.id);
        setJoined(false);
        Alert.alert("Unjoined", `You left «${event.title}»`);
      } else {
        await api.joinEvent(user.uid, event.id);
        setJoined(true);
        Alert.alert("Joined!", `You joined «${event.title}»`);
      }
    } catch {
      Alert.alert("Error", "Could not update registration. Try again.");
    } finally {
      setJoiningLoading(false);
    }
  };

  const onShowOnMap = () => {
    // Navigate to Map tab and pass date to help filter
    const tabsNav = navigation as unknown as NativeStackNavigationProp<BottomTabParamList>;
    // @ts-ignore - some navigators accept switching by name directly
    tabsNav.navigate("Map", { date: event.date });
  };

  const onCopyCoords = async () => {
    const text = `${event.lat},${event.lng}`;
    // Try expo-clipboard first (Expo managed)
    try {
      // dynamic import avoids bundling error when dependency is missing
      const mod: any = await import("expo-clipboard");
      if (mod?.setStringAsync) {
        await mod.setStringAsync(text);
        Alert.alert("Copied", text);
        return;
      }
    } catch (_) {
      // ignore and try next option
    }

    // Try community clipboard (bare RN)
    try {
      const mod2: any = await import("@react-native-clipboard/clipboard");
      if (mod2?.setString) {
        mod2.setString(text);
        Alert.alert("Copied", text);
        return;
      }
    } catch (_) {
      // ignore and fallback
    }

    // Fallback: open Share sheet so user can copy manually
    try {
      await Share.share({ message: text });
    } catch (_) {
      // no-op
    }
    Alert.alert("Copied", text);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>

        {/* Cover with overlay */}
        <View style={s.coverWrap}>
          {event.imageUri ? (
            <Image source={{ uri: event.imageUri }} style={s.cover} resizeMode="cover" />
          ) : (
            <View style={[s.cover, { backgroundColor: "#B0B0B0" }]} />
          )}
          <View style={s.coverDim} />

          <TouchableOpacity style={s.heartOverlay} onPress={() => toggleFavourite(event)}>
            <MaterialCommunityIcons
              name={isFavourite(event.id) ? "heart" : "heart-outline"}
              size={26}
              color="#fff"
            />
          </TouchableOpacity>

          <View style={s.coverBottom}>
            <TouchableOpacity style={s.coverPill}>
              <Text style={s.coverPillText}>View other photos</Text>
            </TouchableOpacity>
            <View style={s.ratingPill}>
              <Text style={s.ratingPillText}>
                {(event.rating ?? 0).toFixed(1)}  ({event.reviewsCount ?? 0} reviews)
              </Text>
              <Text style={{ fontSize: 15, marginLeft: 3 }}>😊</Text>
            </View>
            <TouchableOpacity
              style={s.coverPill}
              onPress={() => navigation.navigate("Reviews" as any, { eventId: event.id })}
            >
              <Text style={s.coverPillText}>Go to reviews</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.titleRow}>
            <Text style={s.title}>{event.title}</Text>
            {(() => {
              const status = getEventStatus(event);
              let style = s.badgeUpcoming;
              if (status === "Past") style = s.badgePast;
              else if (status === "Current") style = s.badgeCurrent;
              return (
                <View style={[s.badge, style]}>
                  <Text style={s.badgeText}>{status}</Text>
                </View>
              );
            })()}
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <MaterialCommunityIcons name="calendar" size={20} color="#111" />
              <Text style={s.metaText}>{event.date}</Text>
            </View>
            {(event.startTime || event.endTime) && (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#111" />
                <Text style={s.metaText}>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </Text>
              </View>
            )}
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <MaterialCommunityIcons name="tag-outline" size={20} color="#111" />
              <Text style={s.metaText}>{CATEGORY_LABEL[event.category]}</Text>
            </View>
            {!!event.price && (
              <View style={s.metaItem}>
                <Text style={[s.metaText, { color: "#3B7D7A", fontWeight: "700" }]}>€{event.price}</Text>
              </View>
            )}
          </View>

          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.desc}>{event.description || "No description"}</Text>

          <Text style={s.sectionTitle}>Location</Text>
          <View style={[s.metaRow, { alignItems: 'center' }]}>
            <Text selectable style={s.desc}>
              Lat: {event.lat.toFixed(5)}  Lng: {event.lng.toFixed(5)}
            </Text>
            <TouchableOpacity style={s.copyBtn} onPress={onCopyCoords}>
              <MaterialCommunityIcons name="content-copy" size={18} color="#111" />
            </TouchableOpacity>
          </View>

          <View style={s.btnRow}>
            {(() => {
              const status = getEventStatus(event);
              if (status !== "Past") {
                return (
                  <TouchableOpacity style={[s.btn, s.joinBtn, joined && s.joinBtnActive]} onPress={onJoin} disabled={joiningLoading}>
                    {joiningLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <MaterialCommunityIcons name={joined ? "account-remove-outline" : "account-plus-outline"} size={20} color="#fff" />}
                    <Text style={s.btnText}>{joined ? "Unjoin" : "Join"}</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
            <TouchableOpacity style={[s.btn, s.mapBtn]} onPress={onShowOnMap}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#111" />
              <Text style={[s.btnText, { color: "#111" }]}>Show on map</Text>
            </TouchableOpacity>
          </View>

          {/* Organizer block under the Join/Map buttons */}
          <View style={s.organizerWrap}>
            <Text style={s.sectionTitle}>Organizer</Text>
            <TouchableOpacity
              style={s.organizerRow}
              onPress={() => organizer && navigation.navigate("UserProfile" as any, { userId: organizer.id })}
              disabled={!organizer}
              activeOpacity={organizer ? 0.7 : 1}
            >
              {organizer?.photoURL ? (
                <Image source={{ uri: organizer.photoURL }} style={s.organizerAvatar} />
              ) : (
                <View style={[s.organizerAvatar, { backgroundColor: '#E6E6E6', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="account-circle" size={36} color="#9A9A9A" />
                </View>
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                {loadingOrganizer ? (
                  <ActivityIndicator size="small" color="#9A9A9A" />
                ) : (
                  <>
                    <Text style={s.organizerName}>{organizer?.name ?? 'Unknown organizer'}</Text>
                    {!!organizer?.email && (
                      <Text style={s.organizerTag}>{organizer.email}</Text>
                    )}
                  </>
                )}
              </View>
              {organizer && (
                <MaterialCommunityIcons name="chevron-right" size={22} color="#9A9A9A" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Bottom Back button styled like in FindScreen */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { paddingBottom: 90 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  coverWrap: { height: 230, position: "relative" },
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.38)" },
  heartOverlay: { position: "absolute", top: 14, left: 14, padding: 4 },
  coverBottom: { position: "absolute", bottom: 12, left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coverPill: { backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  coverPillText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  ratingPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  ratingPillText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  metaText: { marginLeft: 6, fontSize: 14, color: "#333" },
  sectionTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", color: "#111" },
  desc: { marginTop: 6, fontSize: 14, color: "#444", lineHeight: 20 },
  btnRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  btn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginRight: 12 },
  joinBtn: { backgroundColor: "#3B7D7A" },
  joinBtnActive: { backgroundColor: "#2a5a57" },
  mapBtn: { backgroundColor: "#E6E6E6" },
  btnText: { marginLeft: 8, color: "#fff", fontWeight: "700" },
  heartBtn: { padding: 4 },
  copyBtn: { marginLeft: 8, padding: 6, backgroundColor: '#EDEDED', borderRadius: 8 },
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
  organizerWrap: { marginTop: 20 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  organizerAvatar: { width: 48, height: 48, borderRadius: 24 },
  organizerName: { fontSize: 16, fontWeight: '800', color: '#111' },
  organizerTag: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeUpcoming: { backgroundColor: "#DFF2F1" },
  badgeCurrent: { backgroundColor: "#FFF3CD" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#3B7D7A" },
});
