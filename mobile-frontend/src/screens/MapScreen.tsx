import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Platform,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapStackParamList } from "./MapStack";
import { useEvents } from "../context/EventsContext";
import { Place, Category, PlaceEntry, PlaceCategory } from "../types";
import { api } from "../api";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMASSOL: Region = {
    latitude: 34.7071,
    longitude: 33.0226,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const CATEGORY_LABEL: Record<Category, string> = {
    food: "Food",
    sport: "Sport",
    nature: "Nature",
    culture: "Culture",
    other: "Other",
};

const PLACE_CATEGORY_LABEL: Record<PlaceCategory, string> = {
    restaurant: "Restaurant",
    cafe: "Cafe",
    bar: "Bar",
    gym: "Gym",
    park: "Park",
    museum: "Museum",
    gallery: "Gallery",
    hotel: "Hotel",
    shop: "Shop",
    other: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysArray = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push(date.toISOString().split("T")[0]);
    }
    return days;
};

const formatTime = (isoString?: string | null) => {
    if (!isoString) return "?";
    if (!isoString.includes("T")) return isoString;
    return isoString.split("T")[1]?.slice(0, 5) ?? "?";
};

function isOpenNow(hoursJson?: string | null): boolean | null {
    if (!hoursJson) return null;
    try {
        const raw = JSON.parse(hoursJson) as Record<string, { open: string; close: string }>;
        const now = new Date();
        const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const key = keys[now.getDay()];
        const sched = raw[key];
        if (!sched) return false;
        const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const cur = now.getHours() * 60 + now.getMinutes();
        return cur >= toMin(sched.open) && cur <= toMin(sched.close);
    } catch {
        return null;
    }
}

// ─── Selected item union ──────────────────────────────────────────────────────

type SelectedItem =
    | { kind: "event"; id: string }
    | { kind: "place"; id: string }
    | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapScreen() {
    const days = useMemo(() => getDaysArray(), []);
    const [selectedDate, setSelectedDate] = useState(days[0]);
    const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList>>();

    const { events } = useEvents();
    const [placeEntries, setPlaceEntries] = useState<PlaceEntry[]>([]);

    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<SelectedItem>(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const route = useRoute<any>();
    useEffect(() => {
        const incomingDate = route?.params?.date as string | undefined;
        if (incomingDate && days.includes(incomingDate)) {
            setSelectedDate(incomingDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.date]);

    // Load place entries once on mount
    useEffect(() => {
        api.getPlaceEntries()
            .then((data: PlaceEntry[]) => setPlaceEntries(data))
            .catch(console.error);
    }, []);

    const [activeCategories, setActiveCategories] = useState<Set<Category>>(
        () => new Set<Category>(["food", "sport", "nature", "culture", "other"])
    );

    const toggleCategory = (c: Category) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c);
            else next.add(c);
            return next.size === 0
                ? new Set<Category>(["food", "sport", "nature", "culture", "other"])
                : next;
        });
    };

    const filteredEvents = useMemo(() => {
        const q = query.trim().toLowerCase();
        return events.filter((p) => {
            if (p.date !== selectedDate) return false;
            if (!activeCategories.has(p.category)) return false;
            if (!q) return true;
            return (
                p.title.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
            );
        });
    }, [events, query, activeCategories, selectedDate]);

    const filteredPlaces = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return placeEntries;
        return placeEntries.filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q)
        );
    }, [placeEntries, query]);

    // Clear selection if the item scrolled out of filtered results
    useEffect(() => {
        if (!selected) return;
        if (selected.kind === "event" && !filteredEvents.some((e) => e.id === selected.id)) {
            setSelected(null);
        }
    }, [filteredEvents, selected]);

    const selectedEvent = useMemo(
        () => selected?.kind === "event" ? filteredEvents.find((e) => e.id === selected.id) ?? null : null,
        [filteredEvents, selected]
    );
    const selectedPlace = useMemo(
        () => selected?.kind === "place" ? filteredPlaces.find((p) => p.id === selected.id) ?? null : null,
        [filteredPlaces, selected]
    );

    const categories: Category[] = ["food", "sport", "nature", "culture", "other"];

    const renderCalendarDay = useCallback(({ item }: { item: string }) => {
        const d = new Date(item);
        const isActive = item === selectedDate;
        return (
            <Pressable
                onPress={() => setSelectedDate(item)}
                style={[styles.dayItem, isActive && styles.dayItemActive]}
            >
                <Text style={[styles.dayWeekday, isActive && styles.dayTextActive]}>
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>
                <Text style={[styles.dayNumber, isActive && styles.dayTextActive]}>{d.getDate()}</Text>
            </Pressable>
        );
    }, [selectedDate]);

    return (
        <SafeAreaView style={styles.safe} edges={[]}>
            <View style={styles.container}>
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={LIMASSOL}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {/* Event markers — dark */}
                    {filteredEvents.map((p) => (
                        <Marker
                            key={`event-${p.id}`}
                            coordinate={{ latitude: p.lat, longitude: p.lng }}
                            onPress={() => setSelected({ kind: "event", id: p.id })}
                        >
                            <View style={[
                                styles.pin,
                                selected?.kind === "event" && selected.id === p.id && styles.pinActive,
                            ]}>
                                <MaterialCommunityIcons
                                    name="calendar"
                                    size={18}
                                    color={selected?.kind === "event" && selected.id === p.id ? "#fff" : "#111"}
                                />
                            </View>
                        </Marker>
                    ))}

                    {/* Place markers — teal */}
                    {filteredPlaces.map((p) => (
                        <Marker
                            key={`place-${p.id}`}
                            coordinate={{ latitude: p.latitude ?? 0, longitude: p.longitude ?? 0 }}
                            onPress={() => setSelected({ kind: "place", id: p.id })}
                        >
                            <View style={[
                                styles.pin,
                                styles.pinPlace,
                                selected?.kind === "place" && selected.id === p.id && styles.pinPlaceActive,
                            ]}>
                                <MaterialCommunityIcons
                                    name="store"
                                    size={18}
                                    color={selected?.kind === "place" && selected.id === p.id ? "#fff" : "#3B7D7A"}
                                />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={days}
                        keyExtractor={(item) => item}
                        renderItem={renderCalendarDay}
                        contentContainerStyle={styles.calendarList}
                    />
                </View>

                {/* Filters button */}
                <Pressable
                    style={styles.filtersBar}
                    onPress={() => setIsFiltersOpen((v) => !v)}
                >
                    <Text style={styles.filtersText}>Filters</Text>
                    <MaterialCommunityIcons
                        name={isFiltersOpen ? "chevron-up" : "chevron-down"}
                        size={26}
                        color="#111"
                    />
                </Pressable>

                {isFiltersOpen && (
                    <View style={styles.filtersPanel}>
                        <View style={styles.chipsWrap}>
                            {categories.map((c) => {
                                const active = activeCategories.has(c);
                                return (
                                    <Pressable
                                        key={c}
                                        onPress={() => toggleCategory(c)}
                                        style={[styles.chip, active && styles.chipActive]}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                            {CATEGORY_LABEL[c]}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Search */}
                <View style={styles.searchWrap}>
                    <MaterialCommunityIcons name="magnify" size={22} color="#111" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search events & places..."
                        placeholderTextColor="#6a6a6a"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {/* Bottom card — Event */}
                {selectedEvent && (
                    <View style={styles.bottomCard}>
                        <Pressable
                            onPress={() => setSelected(null)}
                            style={styles.closeBtn}
                        >
                            <MaterialCommunityIcons name="close" size={20} color="#111" />
                        </Pressable>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{selectedEvent.title}</Text>
                        </View>
                        <View style={styles.ratingRow}>
                            <View style={styles.ratingBox}>
                                <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                                <Text style={styles.ratingText}>{selectedEvent.rating}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardDesc} numberOfLines={2}>{selectedEvent.description}</Text>
                        <View style={styles.cardFooter}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{CATEGORY_LABEL[selectedEvent.category]}</Text>
                            </View>
                            {selectedEvent.price && (
                                <View style={[styles.badge, { backgroundColor: "#E6F4F1" }]}>
                                    <Text style={[styles.badgeText, { color: "#3B7D7A" }]}>€{selectedEvent.price}</Text>
                                </View>
                            )}
                            {(selectedEvent.startTime || selectedEvent.endTime) && (
                                <View style={[styles.badge, { backgroundColor: "#F0E6FF" }]}>
                                    <Text style={[styles.badgeText, { color: "#6B3B7D" }]}>
                                        {formatTime(selectedEvent.startTime)} – {formatTime(selectedEvent.endTime)}
                                    </Text>
                                </View>
                            )}
                            <Pressable
                                onPress={() => navigation.navigate("EventDetails", { eventId: selectedEvent.id })}
                                style={[styles.badge, { marginLeft: "auto", backgroundColor: "#111" }]}
                            >
                                <Text style={[styles.badgeText, { color: "#fff" }]}>Expand</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Bottom card — Place */}
                {selectedPlace && (
                    <View style={[styles.bottomCard, styles.bottomCardPlace]}>
                        <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={20} color="#111" />
                        </Pressable>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{selectedPlace.name}</Text>
                        </View>
                        <View style={styles.ratingRow}>
                            <View style={styles.ratingBox}>
                                <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                                <Text style={styles.ratingText}>4.5</Text>
                            </View>
                            {isOpenNow(selectedPlace.openingHours) !== null && (
                                <View style={[
                                    styles.openBadge,
                                    isOpenNow(selectedPlace.openingHours) ? styles.openBadgeOpen : styles.openBadgeClosed,
                                ]}>
                                    <Text style={[
                                        styles.openBadgeText,
                                        isOpenNow(selectedPlace.openingHours) ? styles.openBadgeTextOpen : styles.openBadgeTextClosed,
                                    ]}>
                                        {isOpenNow(selectedPlace.openingHours) ? "Open now" : "Closed"}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {!!selectedPlace.description && (
                            <Text style={styles.cardDesc} numberOfLines={2}>{selectedPlace.description}</Text>
                        )}
                        {!!selectedPlace.address && (
                            <View style={styles.placeAddressRow}>
                                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#8AAFB1" />
                                <Text style={styles.placeAddressText} numberOfLines={1}>{selectedPlace.address}</Text>
                            </View>
                        )}
                        <View style={styles.cardFooter}>
                            <View style={[styles.badge, { backgroundColor: "#E6F4F1" }]}>
                                <Text style={[styles.badgeText, { color: "#3B7D7A" }]}>
                                    {PLACE_CATEGORY_LABEL[(selectedPlace.category ?? "other") as PlaceCategory]}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => navigation.navigate("PlaceDetails", { placeId: selectedPlace.id })}
                                style={[styles.badge, { marginLeft: "auto", backgroundColor: "#3B7D7A" }]}
                            >
                                <Text style={[styles.badgeText, { color: "#fff" }]}>Expand</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1 },

    // Pins
    pin: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    pinActive: { backgroundColor: "#111" },
    pinPlace: {
        borderColor: "#3B7D7A",
        backgroundColor: "#E6F4F1",
    },
    pinPlaceActive: { backgroundColor: "#3B7D7A" },

    // Calendar
    calendarContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 10 : 10,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    calendarList: { paddingHorizontal: 18, paddingBottom: 10 },
    dayItem: {
        width: 55,
        height: 70,
        backgroundColor: "#fff",
        borderRadius: 16,
        marginRight: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#e6e6e6",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dayItemActive: { backgroundColor: "#111", borderColor: "#111" },
    dayWeekday: { fontSize: 12, color: "#6a6a6a", fontWeight: "600", marginBottom: 4 },
    dayNumber: { fontSize: 18, fontWeight: "800", color: "#111" },
    dayTextActive: { color: "#fff" },

    // Filters
    filtersBar: {
        position: "absolute",
        top: Platform.OS === "ios" ? 100 : 90,
        left: 18,
        right: 18,
        height: 50,
        borderRadius: 16,
        backgroundColor: "#8FB4B2",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        justifyContent: "space-between",
        zIndex: 5,
    },
    filtersText: { fontSize: 18, fontWeight: "800" },
    filtersPanel: {
        position: "absolute",
        top: Platform.OS === "ios" ? 160 : 150,
        left: 18,
        right: 18,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.95)",
        zIndex: 10,
    },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
    },
    chipActive: { backgroundColor: "#111" },
    chipText: { fontWeight: "700" },
    chipTextActive: { color: "#fff" },

    // Search
    searchWrap: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 40,
        height: 50,
        borderRadius: 16,
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e6e6e6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: { flex: 1, fontSize: 16 },

    // Bottom card shared
    bottomCard: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 105,
        padding: 16,
        borderRadius: 20,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    bottomCardPlace: {
        borderLeftWidth: 4,
        borderLeftColor: "#8AAFB1",
    },
    closeBtn: { position: "absolute", top: 10, right: 10, zIndex: 1, padding: 4 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingRight: 28 },
    cardTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    ratingBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: { marginLeft: 4, fontSize: 12, fontWeight: "700", color: "#FFB800" },
    cardDesc: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 4 },
    placeAddressRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 4 },
    placeAddressText: { fontSize: 13, color: "#666", flex: 1 },
    cardFooter: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    badge: {
        backgroundColor: "#F2F2F2",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: { fontSize: 11, fontWeight: "700", color: "#666", textTransform: "uppercase" },

    // Open/closed badge
    openBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    openBadgeOpen: { backgroundColor: "#E6F9EE" },
    openBadgeClosed: { backgroundColor: "#FDE8E8" },
    openBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    openBadgeTextOpen: { color: "#1E8449" },
    openBadgeTextClosed: { color: "#C0392B" },
});
