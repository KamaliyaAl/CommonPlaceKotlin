import React, { useMemo, useState } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEvents } from "../context/EventsContext";
import { Category } from "../types";
import type { BottomTabParamList } from "../navigation/Tabs";

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
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch (e) {
    return isoString;
  }
};

export default function EventDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { events, toggleFavourite, isFavourite } = useEvents();

  const eventId: string | undefined = route?.params?.eventId;
  const event = useMemo(() => events.find(e => e.id === eventId), [events, eventId]);
  const [joined, setJoined] = useState(false);

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

  const onJoin = () => {
    setJoined((prev) => {
      const next = !prev;
      Alert.alert(next ? "Joined" : "Unjoined", `${event.title}`);
      return next;
    });
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

        {event.imageUri ? (
          <Image source={{ uri: event.imageUri }} style={s.cover} />
        ) : (
          <View style={[s.cover, { backgroundColor: "#E6E6E6" }]} />
        )}

        <View style={s.body}>
          <View style={s.titleRow}>
            <Text style={s.title}>{event.title}</Text>
            <TouchableOpacity style={s.heartBtn} onPress={() => toggleFavourite(event)}>
              <MaterialCommunityIcons
                name={isFavourite(event.id) ? "heart" : "heart-outline"}
                size={26}
                color={isFavourite(event.id) ? "#C0392B" : "#111"}
              />
            </TouchableOpacity>
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
            <TouchableOpacity style={[s.btn, s.joinBtn]} onPress={onJoin}>
              <MaterialCommunityIcons name={joined ? "account-remove-outline" : "account-plus-outline"} size={20} color="#fff" />
              <Text style={s.btnText}>{joined ? "Unjoin" : "Join"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.mapBtn]} onPress={onShowOnMap}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#111" />
              <Text style={[s.btnText, { color: "#111" }]}>Show on map</Text>
            </TouchableOpacity>
          </View>

          {/* Organizer block under the Join/Map buttons */}
          <View style={s.organizerWrap}>
            <Text style={s.sectionTitle}>Organizer</Text>
            <View style={s.organizerRow}>
              {((event as any)?.organizerPhotoUri) ? (
                <Image source={{ uri: (event as any).organizerPhotoUri }} style={s.organizerAvatar} />
              ) : (
                <View style={[s.organizerAvatar, { backgroundColor: '#E6E6E6', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="account-circle" size={36} color="#9A9A9A" />
                </View>
              )}
              <View style={{ marginLeft: 12 }}>
                <Text style={s.organizerName}>{(event as any)?.organizerName ?? 'Unknown organizer'}</Text>
                {!!(event as any)?.organizerTag && (
                  <Text style={s.organizerTag}>{(event as any).organizerTag}</Text>
                )}
              </View>
            </View>
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
  cover: { width: "100%", height: 220 },
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
});
