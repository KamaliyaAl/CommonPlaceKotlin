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
  Modal,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEvents } from "../context/EventsContext";
import MultiSlider from '@ptomasroos/react-native-multi-slider';
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
  const { toggleFavourite, isFavourite } = useEvents();
  const [query, setQuery] = useState("");
  const days = useMemo(() => getDaysArray(), []);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>(["all"]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<Place[]>([]);

  // Internal states for the modal
  const [pendingCategories, setPendingCategories] = useState<string[]>(["all"]);
  const [pendingMinPrice, setPendingMinPrice] = useState("");
  const [pendingMaxPrice, setPendingMaxPrice] = useState("");

  const handleCategoryPress = (val: string) => {
    if (val === "all") {
      setPendingCategories(["all"]);
      return;
    }
    
    let newCats = pendingCategories.includes("all") ? [] : [...pendingCategories];
    if (newCats.includes(val)) {
      newCats = newCats.filter(c => c !== val);
      if (newCats.length === 0) newCats = ["all"];
    } else {
      newCats.push(val);
    }
    setPendingCategories(newCats);
  };

  const applyFilters = () => {
    setActiveCategories(pendingCategories);
    setMinPrice(pendingMinPrice);
    setMaxPrice(pendingMaxPrice);
    setIsFilterVisible(false);
  };

  const resetFilters = () => {
    setPendingCategories(["all"]);
    setPendingMinPrice("");
    setPendingMaxPrice("");
    // We can also immediately reset active filters or let the user click 'Apply'
    setActiveCategories(["all"]);
    setMinPrice("");
    setMaxPrice("");
    setIsFilterVisible(false);
  };

  // Sync pending state when modal opens
  const openModal = () => {
    setPendingCategories(activeCategories);
    setPendingMinPrice(minPrice);
    setPendingMaxPrice(maxPrice);
    setIsFilterVisible(true);
  };

  React.useEffect(() => {
    const fetchFiltered = async () => {
      try {
        const res = await api.getEvents({
          query,
          categories: activeCategories,
          date: activeDate || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined
        });
        setFilteredEvents(res);
      } catch (e) {
        console.error(e);
      }
    };
    const delayDebounceFn = setTimeout(() => {
      fetchFiltered();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, activeCategories, activeDate, minPrice, maxPrice]);

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

      {/* Filters Toggle */}
      <TouchableOpacity 
        style={s.filtersToggle} 
        onPress={openModal}
      >
        <MaterialCommunityIcons name="tune" size={20} color="#fff" />
        <Text style={s.filtersToggleText}>Filters {activeCategories.filter(c => c !== 'all').length > 0 ? `(${activeCategories.filter(c => c !== 'all').length})` : ""}</Text>
      </TouchableOpacity>


      {/* список событий */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <View style={s.card}>
            {/* Main tappable area (everything except top heart and bottom row) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${item.title}`}
              style={{ width: '100%' }}
            >
              {/* Title above the photo, aligned left */}
              <Text style={s.cardTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>

              {/* Content row: photo left, info right */}
              <View style={s.cardContentRow}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={s.thumb} />
                ) : (
                  <View style={s.thumb} />
                )}

                <View style={s.cardBody}>
                  {item.price && (
                    <Text style={{ fontWeight: '800', color: '#3B7D7A', fontSize: 14 }}>€{item.price}</Text>
                  )}

                  {(item.startTime || item.endTime) && (
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </Text>
                  )}

                  <Text style={s.cardDesc} numberOfLines={5} ellipsizeMode="tail">{item.description}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Heart in the top-right corner (must be after main touchable to be on top) */}
            <TouchableOpacity
              style={s.heartAbsolute}
              onPress={() => toggleFavourite(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name={isFavourite(item.id) ? "heart" : "heart-outline"}
                size={26}
                color={isFavourite(item.id) ? "#C0392B" : "#111"}
              />
            </TouchableOpacity>

            {/* Bottom row (non-tappable for details) */}
            <View style={s.cardBottomRow}>
              <View style={s.ratingWrap}>
                <Text style={s.ratingText}>
                  {(item.rating || 0).toFixed(1)} ({(item.reviewsCount || 0)} review{(item.reviewsCount || 0) === 1 ? "" : "s"})
                </Text>
                <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color="#111" />
              </View>
              <TouchableOpacity 
                onPress={() => {
                  (navigation as any).navigate('Map', { 
                    screen: 'MapMain',
                    params: {
                      eventId: item.id,
                      latitude: item.lat,
                      longitude: item.lng
                    }
                  });
                }}
              >
                <Text style={s.mapText}>Show on the map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* BACK внизу */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      {/* FILTER MODAL */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={Keyboard.dismiss} 
          />
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <MaterialCommunityIcons name="close" size={28} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.filterLabel}>Categories</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity 
                    key={c.value} 
                    onPress={() => handleCategoryPress(c.value)}
                    style={[s.catPill, pendingCategories.includes(c.value) && s.catPillActive, { marginBottom: 8, marginRight: 8 }]}
                  >
                    <Text style={[s.catText, pendingCategories.includes(c.value) && s.catTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.filterLabel, { marginTop: 20 }]}>
                Price Range: €{pendingMinPrice === "" ? 0 : pendingMinPrice} - €
                {pendingMaxPrice === "" ? 100 : pendingMaxPrice}
              </Text>

              <View style={s.sliderWrap}>
                <MultiSlider
                  values={[
                    pendingMinPrice === "" ? 0 : parseFloat(pendingMinPrice),
                    pendingMaxPrice === "" ? 100 : parseFloat(pendingMaxPrice),
                  ]}
                  min={0}
                  max={100}
                  step={5}
                  sliderLength={300}
                  allowOverlap={true}
                  snapped
                  enableLabel
                  onValuesChange={(vals) => {
                    const [min, max] = vals;
                    setPendingMinPrice(String(min));
                    setPendingMaxPrice(String(max));
                  }}
                  selectedStyle={s.sliderSelected}
                  unselectedStyle={s.sliderUnselected}
                  trackStyle={s.sliderTrack}
                  containerStyle={s.sliderContainer}
                  customMarker={() => <View style={s.sliderThumb} />}
                  customLabel={(e) => {
                    const sliderWidth = 300;

                    const marker1 = e.oneMarkerLeftPosition ?? 0;
                    const marker2 = e.twoMarkerLeftPosition ?? sliderWidth;

                    return (
                      <View style={s.labelsOverlay} pointerEvents="none">
                        <View style={[s.priceBubbleWrap, { left: marker1 }]}>
                          <View style={s.priceBubble}>
                            <Text style={s.priceBubbleText}>€{e.oneMarkerValue ?? 0}</Text>
                          </View>
                          <View style={s.priceBubbleArrow} />
                        </View>

                        <View style={[s.priceBubbleWrap, { left: marker2 }]}>
                          <View style={s.priceBubble}>
                            <Text style={s.priceBubbleText}>€{e.twoMarkerValue ?? 100}</Text>
                          </View>
                          <View style={s.priceBubbleArrow} />
                        </View>
                      </View>
                    );
                  }}
                />
              </View>
              <TouchableOpacity 
                style={s.applyBtn}
                onPress={applyFilters}
              >
                <Text style={s.applyText}>Apply Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={s.resetBtn}
                onPress={resetFilters}
              >
                <Text style={s.resetText}>Reset All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  filtersToggleText: {
    color: '#fff',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
sliderWrap: {
  marginTop: 18,
  paddingTop: 58,
  width: 376, // 300 + 38 + 38
  alignSelf: "center",
  position: "relative",
},

sliderContainer: {
  width: 300,
  alignSelf: "center",
},

labelsOverlay: {
  position: "absolute",
  top: -58,
  left: 38, // начало реального track
  width: 300,
  height: 52,
  overflow: "visible",
},

priceBubbleWrap: {
  position: "absolute",
  width: 76,
  marginLeft: -38, // центрируем bubble относительно координаты marker
  alignItems: "center",
},

priceBubble: {
  width: 76,
  paddingVertical: 10,
  borderRadius: 16,
  backgroundColor: "#3A3A3A",
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
},

priceBubbleText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "800",
},

priceBubbleArrow: {
  marginTop: -4,
  width: 14,
  height: 14,
  backgroundColor: "#3A3A3A",
  transform: [{ rotate: "45deg" }],
},

sliderTrack: {
  height: 8,
  borderRadius: 999,
},

sliderUnselected: {
  backgroundColor: "#CFCFCF",
},

sliderSelected: {
  backgroundColor: "#444",
},

sliderThumb: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: "#2A2A2A",
  borderWidth: 4,
  borderColor: "#F3F3F3",
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 5,
},
  applyBtn: {
    backgroundColor: '#111',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  applyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  resetBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 20,
  },
  resetText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },

  card: {
    backgroundColor: "#D9D9D9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  cardLeft: { width: 28, alignItems: "center" },
  heartBtn: { padding: 2 },
  heartAbsolute: { position: 'absolute', top: 10, right: 10, padding: 2, zIndex: 10, elevation: 10 },

  thumb: { width: 64, height: 64, backgroundColor: "#777", borderRadius: 12 },

  cardContentRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: "900", fontSize: 16, color: "#111", marginBottom: 6 },
  cardDesc: { marginTop: 4, color: "#222" },

  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  mapText: { color: "#222", fontWeight: "700", marginLeft: 'auto', textAlign: 'right' },

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