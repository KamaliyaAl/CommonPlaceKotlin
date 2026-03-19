import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Pressable,
    Platform,
    FlatList,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useEvents } from "../context/EventsContext";
import { Place, Category } from "../types";



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

export default function MapScreen() {
    const days = useMemo(() => getDaysArray(), []);
    const [selectedDate, setSelectedDate] = useState(days[0]);

    const { events } = useEvents();

    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const route = useRoute<any>();
    useEffect(() => {
        const incomingDate = route?.params?.date as string | undefined;
        if (incomingDate && days.includes(incomingDate)) {
            setSelectedDate(incomingDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.date]);

    const [activeCategories, setActiveCategories] = useState<Set<Category>>(
        () => new Set<Category>(["food", "sport", "nature", "culture", "other"])
    );

    const toggleCategory = (c: Category) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c);
            else next.add(c);
            if (next.size === 0) {
                return new Set<Category>(["food", "sport", "nature", "culture", "other"]);
            }
            return next;
        });
    };

    const filteredPlaces = useMemo(() => {
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

    const selected = useMemo(
        () => filteredPlaces.find((p) => p.id === selectedId) ?? null,
        [filteredPlaces, selectedId]
    );

    useEffect(() => {
        if (selectedId && !filteredPlaces.some((p) => p.id === selectedId)) {
            setSelectedId(null);
        }
    }, [filteredPlaces, selectedId]);

    const categories: Category[] = ["food", "sport", "nature", "culture", "other"];

    const renderCalendarDay = ({ item }: { item: string }) => {
        const d = new Date(item);
        const dayNum = d.getDate();
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
        const isActive = item === selectedDate;

        return (
            <Pressable
                onPress={() => setSelectedDate(item)}
                style={[styles.dayItem, isActive && styles.dayItemActive]}
            >
                <Text style={[styles.dayWeekday, isActive && styles.dayTextActive]}>{weekday}</Text>
                <Text style={[styles.dayNumber, isActive && styles.dayTextActive]}>{dayNum}</Text>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={LIMASSOL}
                    onPress={() => setSelectedId(null)}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {filteredPlaces.map((p) => (
                        <Marker
                            key={p.id}
                            coordinate={{ latitude: p.lat, longitude: p.lng }}
                            onPress={() => setSelectedId(p.id)}
                        >
                            <View style={[styles.pin, selectedId === p.id && styles.pinActive]}>
                                <MaterialCommunityIcons
                                    name="map-marker"
                                    size={24}
                                    color={selectedId === p.id ? "#FFFFFF" : "#111111"}
                                />
                            </View>
                            <Callout onPress={() => setSelectedId(p.id)}>
                                <View style={{ maxWidth: 220 }}>
                                    <Text style={{ fontWeight: "700", fontSize: 14 }}>{p.title}</Text>
                                    <Text style={{ color: "#555", marginTop: 2 }}>{CATEGORY_LABEL[p.category]}</Text>
                                    <Text style={{ color: "#777", marginTop: 4 }} numberOfLines={2}>
                                        {p.description}
                                    </Text>
                                </View>
                            </Callout>
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
                        placeholder="Search..."
                        placeholderTextColor="#6a6a6a"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {/* Bottom card */}
                {selected && (
                    <View style={styles.bottomCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{selected.title}</Text>
                            <View style={styles.ratingBox}>
                                <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                                <Text style={styles.ratingText}>{selected.rating}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardDesc}>{selected.description}</Text>
                        <View style={styles.cardFooter}>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>
                                    {CATEGORY_LABEL[selected.category]}
                                </Text>
                            </View>
                            {selected.price && (
                                <View style={[styles.categoryBadge, { marginLeft: 8, backgroundColor: "#E6F4F1" }]}>
                                    <Text style={[styles.categoryBadgeText, { color: "#3B7D7A" }]}>
                                        {selected.price}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1 },

    pin: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    pinActive: { backgroundColor: "#111" },

    calendarContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 10 : 10,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    calendarList: {
        paddingHorizontal: 18,
        paddingBottom: 10,
    },
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
    dayItemActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    dayWeekday: {
        fontSize: 12,
        color: "#6a6a6a",
        fontWeight: "600",
        marginBottom: 4,
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111",
    },
    dayTextActive: {
        color: "#fff",
    },

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
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    cardTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
    ratingBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: "700",
        color: "#FFB800",
    },
    cardDesc: { fontSize: 14, color: "#444", lineHeight: 20 },
    cardFooter: {
        marginTop: 12,
        flexDirection: "row",
    },
    categoryBadge: {
        backgroundColor: "#F2F2F2",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#666",
        textTransform: "uppercase",
    },
});
