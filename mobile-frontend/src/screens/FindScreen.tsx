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
import { useEvents } from "../context/EventsContext";
import { Place } from "../types";

import { api } from "../api";
import { Category } from "../types";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Food", value: "food" },
  { label: "Sport", value: "sport" },
  { label: "Nature", value: "nature" },
  { label: "Culture", value: "culture" },
  { label: "Other", value: "other" },
];

const getDaysArray = () => {
    const days: { d: string; n: number; fullDate: string }[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        days.push({
            d: dayNames[date.getDay()],
            n: date.getDate(),
            fullDate: `${yyyy}-${mm}-${dd}`
        });
    }
    return days;
};

function DayPill({ d, n, active }: { d: string; n: number; active?: boolean }) {
  return (
    <View style={[s.dayPill, active && s.dayPillActive]}>
      <Text style={[s.dayText, active && s.dayTextActive]}>{d}</Text>
      <Text style={[s.dayText, active && s.dayTextActive]}>{n}</Text>
    </View>
  );
}

const formatTime = (isoString?: string | null) => {
  if (!isoString) return "?";
  if (!isoString.includes("T")) return isoString;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return isoString;
  }
};

export default function FindScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const days = useMemo(() => getDaysArray(), []);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>(["all"]);
  const [filteredEvents, setFilteredEvents] = useState<Place[]>([]);

  const handleCategoryPress = (val: string) => {
    if (val === "all") {
      setActiveCategories(["all"]);
      return;
    }
    
    let newCats = activeCategories.includes("all") ? [] : [...activeCategories];
    if (newCats.includes(val)) {
      newCats = newCats.filter(c => c !== val);
      if (newCats.length === 0) newCats = ["all"];
    } else {
      newCats.push(val);
    }
    setActiveCategories(newCats);
  };

  React.useEffect(() => {
    const fetchFiltered = async () => {
      try {
        const res = await api.getEvents({
          query,
          categories: activeCategories,
          date: activeDate || undefined
        });
        setFilteredEvents(res);
      } catch (e) {
        console.error(e);
      }
    };
    // Fetch immediately, but in a real app you might want to debounce the query.
    // For simplicity, we fetch every time the state changes.
    const delayDebounceFn = setTimeout(() => {
      fetchFiltered();
    }, 300); // 300ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [query, activeCategories, activeDate]);

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
          {days.map((x) => (
            <TouchableOpacity key={x.fullDate} onPress={() => setActiveDate(activeDate === x.fullDate ? null : x.fullDate)}>
              <DayPill d={x.d} n={x.n} active={activeDate === x.fullDate} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={s.arrowBtn}>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={{ marginTop: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity 
              key={c.value} 
              onPress={() => handleCategoryPress(c.value)}
              style={[s.catPill, activeCategories.includes(c.value) && s.catPillActive]}
            >
              <Text style={[s.catText, activeCategories.includes(c.value) && s.catTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* список событий */}
      <FlatList
        data={filteredEvents}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                {item.price && (
                  <Text style={{ fontWeight: '800', color: '#3B7D7A', fontSize: 14 }}>{item.price}€</Text>
                )}
              </View>
              {(item.startTime || item.endTime) && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </Text>
              )}
              <Text style={s.cardDesc}>{item.description}</Text>

              <View style={s.cardBottomRow}>
                <Text style={s.mapText}>Show on the map</Text>

                <View style={s.ratingWrap}>
                  <Text style={s.ratingText}>
                    {(item.rating || 0).toFixed(1)} ({(item.reviewsCount || 0)} review{(item.reviewsCount || 0) === 1 ? "" : "s"})
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

  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eee",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  catPillActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  catText: {
    fontWeight: "600",
    color: "#555",
  },
  catTextActive: {
    color: "#fff",
  },

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