import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Platform,
    FlatList,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Keyboard,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MultiSlider from '@ptomasroos/react-native-multi-slider';
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

const CATEGORIES: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Food", value: "food" },
    { label: "Sport", value: "sport" },
    { label: "Nature", value: "nature" },
    { label: "Culture", value: "culture" },
    { label: "Other", value: "other" },
];

const CATEGORY_LABEL: Record<string, string> = {
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

const PLACE_CATEGORIES: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Restaurant", value: "restaurant" },
    { label: "Cafe", value: "cafe" },
    { label: "Bar", value: "bar" },
    { label: "Gym", value: "gym" },
    { label: "Park", value: "park" },
    { label: "Museum", value: "museum" },
    { label: "Gallery", value: "gallery" },
    { label: "Hotel", value: "hotel" },
    { label: "Shop", value: "shop" },
    { label: "Other", value: "other" },
];

const PLACE_TO_GENERAL_CATEGORY: Record<string, string> = {
    restaurant: "food",
    cafe: "food",
    bar: "food",
    gym: "sport",
    park: "nature",
    museum: "culture",
    gallery: "culture",
    hotel: "other",
    shop: "other",
    other: "other",
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
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList>>();

    const [placeEntries, setPlaceEntries] = useState<PlaceEntry[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Place[]>([]);

    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<SelectedItem>(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Filter states
    const [activeContentType, setActiveContentType] = useState<"all" | "events" | "places">("all");
    const [activeCategories, setActiveCategories] = useState<string[]>(["all"]);
    const [activePlaceCategories, setActivePlaceCategories] = useState<string[]>(["all"]);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    // Internal modal states
    const [pendingContentType, setPendingContentType] = useState<"all" | "events" | "places">("all");
    const [pendingCategories, setPendingCategories] = useState<string[]>(["all"]);
    const [pendingPlaceCategories, setPendingPlaceCategories] = useState<string[]>(["all"]);
    const [pendingMinPrice, setPendingMinPrice] = useState("");
    const [pendingMaxPrice, setPendingMaxPrice] = useState("");

    const mapRef = useRef<MapView>(null);
    const route = useRoute<any>();
    
    useEffect(() => {
        const params = route?.params;
        if (!params) return;

        // If explicitly centering on an event
        if (params.latitude && params.longitude) {
            mapRef.current?.animateToRegion({
                latitude: params.latitude,
                longitude: params.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }

        if (params.eventId) {
            setSelected({ kind: "event", id: params.eventId });
        }

        // Legacy: only keep date redir if provided without event centering
        if (params.date && days.includes(params.date)) {
            setSelectedDate(params.date);
        }
    }, [route?.params, days]);

    // Load place entries once on mount
    useEffect(() => {
        api.getPlaceEntries()
            .then((data: PlaceEntry[]) => setPlaceEntries(data))
            .catch(console.error);
    }, []);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await api.getEvents({
                query,
                categories: activeCategories,
                date: selectedDate || undefined,
                minPrice: minPrice || undefined,
                maxPrice: maxPrice || undefined,
                minStartTime: !selectedDate ? 'now' : undefined
            });
            setFilteredEvents(res);
        } catch (e) {
            console.error(e);
        }
    }, [query, activeCategories, selectedDate, minPrice, maxPrice]);

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchEvents();
        }
    }, [isFocused, fetchEvents]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchEvents();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [query, activeCategories, selectedDate, minPrice, maxPrice]);

    const filteredPlaces = useMemo(() => {
        if (activeContentType === "events") return [];
        const q = query.trim().toLowerCase();

        return placeEntries.filter((p) => {
            const matchesQuery = !q || (
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q)
            );
            if (!matchesQuery) return false;

            if (!activePlaceCategories.includes("all")) {
                if (!activePlaceCategories.includes(p.category || "other")) return false;
            }

            if (!activeCategories.includes("all")) {
                const mappedCat = PLACE_TO_GENERAL_CATEGORY[p.category || "other"] || "other";
                if (!activeCategories.includes(mappedCat)) return false;
            }

            return true;
        });
    }, [placeEntries, query, activeCategories, activePlaceCategories, activeContentType]);

    const selectedEvent = useMemo(
        () => selected?.kind === "event" ? filteredEvents.find((e) => e.id === selected.id) ?? null : null,
        [filteredEvents, selected]
    );
    const selectedPlace = useMemo(
        () => selected?.kind === "place" ? filteredPlaces.find((p) => p.id === selected.id) ?? null : null,
        [filteredPlaces, selected]
    );

    const handleCategoryPress = (val: string) => {
        if (val === "all") { setPendingCategories(["all"]); return; }
        let newCats = pendingCategories.includes("all") ? [] : [...pendingCategories];
        if (newCats.includes(val)) {
            newCats = newCats.filter(c => c !== val);
            if (newCats.length === 0) newCats = ["all"];
        } else {
            newCats.push(val);
        }
        setPendingCategories(newCats);
    };

    const handlePlaceCategoryPress = (val: string) => {
        if (val === "all") { setPendingPlaceCategories(["all"]); return; }
        let newCats = pendingPlaceCategories.includes("all") ? [] : [...pendingPlaceCategories];
        if (newCats.includes(val)) {
            newCats = newCats.filter(c => c !== val);
            if (newCats.length === 0) newCats = ["all"];
        } else {
            newCats.push(val);
        }
        setPendingPlaceCategories(newCats);
    };

    const applyFilters = () => {
        setActiveContentType(pendingContentType);
        setActiveCategories(pendingCategories);
        setActivePlaceCategories(pendingPlaceCategories);
        setMinPrice(pendingMinPrice);
        setMaxPrice(pendingMaxPrice);
        setIsFiltersOpen(false);
    };

    const resetFilters = () => {
        setPendingContentType("all");
        setPendingCategories(["all"]);
        setPendingPlaceCategories(["all"]);
        setPendingMinPrice("");
        setPendingMaxPrice("");
        setActiveContentType("all");
        setActiveCategories(["all"]);
        setActivePlaceCategories(["all"]);
        setMinPrice("");
        setMaxPrice("");
        setIsFiltersOpen(false);
    };

    const openModal = () => {
        setPendingContentType(activeContentType);
        setPendingCategories(activeCategories);
        setPendingPlaceCategories(activePlaceCategories);
        setPendingMinPrice(minPrice);
        setPendingMaxPrice(maxPrice);
        setIsFiltersOpen(true);
    };

    const filterBadgeCount =
        activeCategories.filter(c => c !== "all").length +
        activePlaceCategories.filter(c => c !== "all").length +
        (activeContentType !== "all" ? 1 : 0) +
        (minPrice !== "" ? 1 : 0);

    const renderCalendarDay = useCallback(({ item }: { item: string }) => {
        const d = new Date(item);
        const isActive = item === selectedDate;
        return (
            <Pressable
                onPress={() => setSelectedDate(selectedDate === item ? null : item)}
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
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={LIMASSOL}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {/* Event markers — dark */}
                    {activeContentType !== "places" && filteredEvents.map((p) => (
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

                {/* Top controls row: filters button + content-type toggle */}
                <View style={styles.topControlsRow}>
                    <Pressable style={styles.filtersBar} onPress={openModal}>
                        <MaterialCommunityIcons name="tune" size={20} color="#111" />
                        <Text style={styles.filtersText}>
                            Filters{filterBadgeCount > 0 ? ` (${filterBadgeCount})` : ""}
                        </Text>
                    </Pressable>
                    <View style={styles.typeToggleRow}>
                        {(["all", "events", "places"] as const).map((t) => (
                            <Pressable
                                key={t}
                                style={[styles.typeChip, activeContentType === t && styles.typeChipActive]}
                                onPress={() => setActiveContentType(t)}
                            >
                                <Text style={[styles.typeChipText, activeContentType === t && styles.typeChipTextActive]}>
                                    {t === "all" ? "All" : t === "events" ? "Events" : "Places"}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

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
                                <Text style={styles.ratingText}>{selectedEvent.rating || 0}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardDesc} numberOfLines={2}>{selectedEvent.description}</Text>
                        <View style={styles.cardFooter}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{CATEGORY_LABEL[selectedEvent.category] || "Other"}</Text>
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

                {/* Filter Modal */}
                <Modal
                    visible={isFiltersOpen}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsFiltersOpen(false)}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Map Filters</Text>
                                <TouchableOpacity onPress={() => setIsFiltersOpen(false)}>
                                    <MaterialCommunityIcons name="close" size={28} color="#111" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>

                                {/* Content type */}
                                <Text style={styles.filterLabel}>Show</Text>
                                <View style={styles.chipsWrap}>
                                    {(["all", "events", "places"] as const).map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setPendingContentType(t)}
                                            style={[styles.chip, pendingContentType === t && styles.chipActive]}
                                        >
                                            <Text style={[styles.chipText, pendingContentType === t && styles.chipTextActive]}>
                                                {t === "all" ? "All" : t === "events" ? "Events" : "Places"}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Event categories */}
                                {pendingContentType !== "places" && (
                                    <>
                                        <Text style={[styles.filterLabel, { marginTop: 24 }]}>Event Categories</Text>
                                        <View style={styles.chipsWrap}>
                                            {CATEGORIES.map(c => (
                                                <TouchableOpacity
                                                    key={c.value}
                                                    onPress={() => handleCategoryPress(c.value)}
                                                    style={[styles.chip, pendingCategories.includes(c.value) && styles.chipActive]}
                                                >
                                                    <Text style={[styles.chipText, pendingCategories.includes(c.value) && styles.chipTextActive]}>
                                                        {c.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Place categories */}
                                {pendingContentType !== "events" && (
                                    <>
                                        <Text style={[styles.filterLabel, { marginTop: 24 }]}>Place Categories</Text>
                                        <View style={styles.chipsWrap}>
                                            {PLACE_CATEGORIES.map(c => (
                                                <TouchableOpacity
                                                    key={c.value}
                                                    onPress={() => handlePlaceCategoryPress(c.value)}
                                                    style={[styles.chip, pendingPlaceCategories.includes(c.value) && styles.chipActive]}
                                                >
                                                    <Text style={[styles.chipText, pendingPlaceCategories.includes(c.value) && styles.chipTextActive]}>
                                                        {c.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Price filter (events only) */}
                                {pendingContentType !== "places" && (
                                    <>
                                        <Text style={[styles.filterLabel, { marginTop: 24 }]}>
                                            Price Range: €{pendingMinPrice === "" ? 0 : pendingMinPrice} - €{pendingMaxPrice === "" ? 50 : pendingMaxPrice}
                                        </Text>
                                        <View style={styles.sliderWrap}>
                                            <MultiSlider
                                                values={[
                                                    pendingMinPrice === "" ? 0 : parseFloat(pendingMinPrice),
                                                    pendingMaxPrice === "" ? 50 : parseFloat(pendingMaxPrice),
                                                ]}
                                                min={0}
                                                max={50}
                                                step={2}
                                                sliderLength={300}
                                                allowOverlap={true}
                                                snapped
                                                enableLabel
                                                onValuesChange={(vals) => {
                                                    const [min, max] = vals;
                                                    setPendingMinPrice(String(min));
                                                    setPendingMaxPrice(String(max));
                                                }}
                                                selectedStyle={styles.sliderSelected}
                                                unselectedStyle={styles.sliderUnselected}
                                                trackStyle={styles.sliderTrack}
                                                containerStyle={styles.sliderContainer}
                                                customMarker={() => <View style={styles.sliderThumb} />}
                                                customLabel={(e) => {
                                                    const marker1 = e.oneMarkerLeftPosition ?? 0;
                                                    const marker2 = e.twoMarkerLeftPosition ?? 300;
                                                    return (
                                                        <View style={styles.labelsOverlay} pointerEvents="none">
                                                            <View style={[styles.priceBubbleWrap, { left: marker1 }]}>
                                                                <View style={styles.priceBubble}>
                                                                    <Text style={styles.priceBubbleText}>€{e.oneMarkerValue ?? 0}</Text>
                                                                </View>
                                                                <View style={styles.priceBubbleArrow} />
                                                            </View>
                                                            <View style={[styles.priceBubbleWrap, { left: marker2 }]}>
                                                                <View style={styles.priceBubble}>
                                                                    <Text style={styles.priceBubbleText}>€{e.twoMarkerValue ?? 50}</Text>
                                                                </View>
                                                                <View style={styles.priceBubbleArrow} />
                                                            </View>
                                                        </View>
                                                    );
                                                }}
                                            />
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                                    <Text style={styles.applyText}>Apply Filters</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                                    <Text style={styles.resetText}>Reset All</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
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

    // Top controls row
    topControlsRow: {
        position: "absolute",
        top: Platform.OS === "ios" ? 100 : 90,
        left: 18,
        right: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        zIndex: 5,
    },
    filtersBar: {
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 22,
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#e6e6e6",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
    },
    filtersText: { fontSize: 14, fontWeight: "700" },
    typeToggleRow: {
        flexDirection: "row",
        gap: 6,
        flex: 1,
    },
    typeChip: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e6e6e6",
        alignItems: "center",
        justifyContent: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
    },
    typeChipActive: { backgroundColor: "#111", borderColor: "#111" },
    typeChipText: { fontSize: 12, fontWeight: "700", color: "#555" },
    typeChipTextActive: { color: "#fff" },

    // Modal
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
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#eee",
        borderWidth: 1,
        borderColor: "#ccc",
    },
    chipActive: { backgroundColor: "#111", borderColor: "#111" },
    chipText: { fontWeight: "700", color: "#555" },
    chipTextActive: { color: "#fff" },

    // Slider
    sliderWrap: {
        marginTop: 18,
        paddingTop: 58,
        width: 376,
        alignSelf: "center",
        position: "relative",
    },
    sliderContainer: { width: 300, alignSelf: "center" },
    labelsOverlay: {
        position: "absolute",
        top: -58,
        left: 38,
        width: 300,
        height: 52,
        overflow: "visible",
    },
    priceBubbleWrap: {
        position: "absolute",
        width: 76,
        marginLeft: -38,
        alignItems: "center",
    },
    priceBubble: {
        width: 76,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: "#3A3A3A",
        alignItems: "center",
        justifyContent: "center",
    },
    priceBubbleText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    priceBubbleArrow: {
        marginTop: -4,
        width: 14,
        height: 14,
        backgroundColor: "#3A3A3A",
        transform: [{ rotate: "45deg" }],
    },
    sliderTrack: { height: 8, borderRadius: 4 },
    sliderUnselected: { backgroundColor: "#CFCFCF" },
    sliderSelected: { backgroundColor: "#444" },
    sliderThumb: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#2A2A2A",
        borderWidth: 4,
        borderColor: "#F3F3F3",
    },

    // Buttons
    applyBtn: {
        backgroundColor: '#111',
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
    },
    applyText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    resetBtn: { alignItems: 'center', marginTop: 16, paddingBottom: 20 },
    resetText: { color: '#666', fontSize: 16, fontWeight: '600' },

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

    // Bottom card
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

