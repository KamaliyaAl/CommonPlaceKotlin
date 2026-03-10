import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

type EventItem = {
  id: string;
  title: string;
  desc: string;
  rating: number;
  reviews: number;
  liked: boolean;
};

const MOCK: EventItem[] = [
  { id: "1", title: "Beach Club ABOBA", desc: "Short description what is going on", rating: 4.8, reviews: 101, liked: false },
  { id: "2", title: "Sport ABOBA", desc: "Short description what is going on", rating: 2.1, reviews: 10, liked: false },
  { id: "3", title: "Sport ABOBA", desc: "Short description what is going on", rating: 4.9, reviews: 101, liked: true },
  { id: "4", title: "Sport ABOBA", desc: "Short description what is going on", rating: 4.0, reviews: 1, liked: false },
];

const DAYS = [
  { d: "Mn", n: 21 },
  { d: "Tue", n: 22 },
  { d: "Wd", n: 23 },
  { d: "Ths", n: 24 },
  { d: "Fri", n: 25 },
  { d: "Sut", n: 26 },
  { d: "Sun", n: 27 },
];

function DayPill({ d, n, active }: { d: string; n: number; active?: boolean }) {
  return (
    <View style={[s.dayPill, active && s.dayPillActive]}>
      <Text style={[s.dayText, active && s.dayTextActive]}>{d}</Text>
      <Text style={[s.dayText, active && s.dayTextActive]}>{n}</Text>
    </View>
  );
}

export default function FindScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const [activeDay, setActiveDay] = useState(0);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK;
    return MOCK.filter((x) => x.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <SafeAreaView style={s.safe}>
      {/* SEARCH наверху */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color="#111" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search..."
          style={s.searchInput}
          placeholderTextColor="#555"
        />
      </View>

      {/* Даты */}
      <View style={s.datesRow}>
        <TouchableOpacity style={s.arrowBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {DAYS.map((x, idx) => (
            <TouchableOpacity key={x.d + x.n} onPress={() => setActiveDay(idx)}>
              <DayPill d={x.d} n={x.n} active={idx === activeDay} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={s.arrowBtn}>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Add Filters */}
      <TouchableOpacity style={s.filtersBtn}>
        <Text style={s.filtersText}>Add Filters</Text>
        <MaterialCommunityIcons name="chevron-down" size={28} color="#fff" />
      </TouchableOpacity>

      {/* список событий */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <TouchableOpacity style={s.heartBtn}>
                <MaterialCommunityIcons
                  name={item.liked ? "heart" : "heart-outline"}
                  size={26}
                  color="#111"
                />
              </TouchableOpacity>
            </View>

            <View style={s.thumb} />

            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDesc}>{item.desc}</Text>

              <View style={s.cardBottomRow}>
                <Text style={s.mapText}>Show on the map</Text>

                <View style={s.ratingWrap}>
                  <Text style={s.ratingText}>
                    {item.rating.toFixed(1)} ({item.reviews} review{item.reviews === 1 ? "" : "s"})
                  </Text>
                  <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color="#111" />
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* BACK внизу */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  searchWrap: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: "#D9D9D9",
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#111" },

  datesRow: {
    marginTop: 12,
    marginHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  arrowBtn: { width: 34, alignItems: "center" },

  dayPill: {
    width: 48,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dayPillActive: { backgroundColor: "#111", borderColor: "#111" },
  dayText: { fontWeight: "800", color: "#111", fontSize: 13 },
  dayTextActive: { color: "#fff" },

  filtersBtn: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#111",
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filtersText: { color: "#fff", fontWeight: "800", fontSize: 18 },

  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },

  card: {
    backgroundColor: "#D9D9D9",
    borderRadius: 0,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardLeft: { width: 28, alignItems: "center" },
  heartBtn: { padding: 2 },

  thumb: { width: 64, height: 64, backgroundColor: "#777" },

  cardBody: { flex: 1 },
  cardTitle: { fontWeight: "900", fontSize: 16, color: "#111" },
  cardDesc: { marginTop: 4, color: "#222" },

  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapText: { color: "#222", fontWeight: "700" },

  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingText: { color: "#111", fontWeight: "700" },

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