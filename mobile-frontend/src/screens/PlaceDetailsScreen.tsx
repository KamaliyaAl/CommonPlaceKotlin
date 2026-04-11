import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import type { PlaceEntry, PlaceCategory } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
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

const CATEGORY_ICON: Record<PlaceCategory, string> = {
    restaurant: "silverware-fork-knife",
    cafe: "coffee",
    bar: "glass-cocktail",
    gym: "dumbbell",
    park: "tree",
    museum: "bank",
    gallery: "image-frame",
    hotel: "bed",
    shop: "shopping",
    other: "map-marker",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday",
    thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

function parseOpeningHours(hoursJson?: string | null) {
    if (!hoursJson) return null;
    try {
        const raw = JSON.parse(hoursJson) as Record<string, { open: string; close: string }>;
        return DAY_ORDER
            .filter((d) => raw[d])
            .map((d) => ({ day: DAY_LABELS[d], open: raw[d].open, close: raw[d].close }));
    } catch {
        return null;
    }
}

function isOpenNow(hoursJson?: string | null): boolean | null {
    if (!hoursJson) return null;
    try {
        const raw = JSON.parse(hoursJson) as Record<string, { open: string; close: string }>;
        const now = new Date();
        const key = DAY_ORDER[now.getDay() === 0 ? 6 : now.getDay() - 1];
        const sched = raw[key];
        if (!sched) return false;
        const toMin = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        };
        const cur = now.getHours() * 60 + now.getMinutes();
        return cur >= toMin(sched.open) && cur <= toMin(sched.close);
    } catch {
        return null;
    }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlaceDetailsScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const placeId: string = route?.params?.placeId;

    const [place, setPlace] = useState<PlaceEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getPlaceEntries().then((all: PlaceEntry[]) => {
            setPlace(all.find((p) => p.id === placeId) ?? null);
        }).catch(console.error).finally(() => setLoading(false));
    }, [placeId]);

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <ActivityIndicator style={{ flex: 1 }} size="large" color="#8AAFB1" />
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!place) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Text style={s.title}>Place not found</Text>
                </View>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const hours = parseOpeningHours(place.openingHours);
    const openNow = isOpenNow(place.openingHours);
    const cat = (place.category ?? "other") as PlaceCategory;

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.container}>
                {/* Cover image */}
                {place.imageUri ? (
                    <Image source={{ uri: place.imageUri }} style={s.cover} resizeMode="cover" />
                ) : (
                    <View style={[s.cover, s.coverPlaceholder]}>
                        <MaterialCommunityIcons
                            name={CATEGORY_ICON[cat] as any}
                            size={64}
                            color="#8AAFB1"
                        />
                    </View>
                )}

                <View style={s.body}>
                    {/* Title + rating */}
                    <View style={s.titleRow}>
                        <Text style={s.title}>{place.name}</Text>
                        <View style={s.ratingBox}>
                            <MaterialCommunityIcons name="star" size={16} color="#FFB800" />
                            <Text style={s.ratingText}>4.5</Text>
                        </View>
                    </View>

                    {/* Category + open status */}
                    <View style={s.badgeRow}>
                        <View style={s.categoryBadge}>
                            <MaterialCommunityIcons
                                name={CATEGORY_ICON[cat] as any}
                                size={13}
                                color="#3B7D7A"
                                style={{ marginRight: 4 }}
                            />
                            <Text style={s.categoryBadgeText}>{CATEGORY_LABEL[cat]}</Text>
                        </View>
                        {openNow !== null && (
                            <View style={[s.openBadge, openNow ? s.openBadgeOpen : s.openBadgeClosed]}>
                                <Text style={[s.openBadgeText, openNow ? s.openBadgeTextOpen : s.openBadgeTextClosed]}>
                                    {openNow ? "Open now" : "Closed"}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    {!!place.description && (
                        <>
                            <Text style={s.sectionTitle}>About</Text>
                            <Text style={s.desc}>{place.description}</Text>
                        </>
                    )}

                    {/* Contact info */}
                    {(!!place.address || !!place.phone || !!place.website) && (
                        <Text style={s.sectionTitle}>Contact</Text>
                    )}

                    {!!place.address && (
                        <View style={s.infoRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#8AAFB1" />
                            <Text style={s.infoText}>{place.address}</Text>
                        </View>
                    )}

                    {!!place.phone && (
                        <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(`tel:${place.phone}`)}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#8AAFB1" />
                            <Text style={[s.infoText, s.infoLink]}>{place.phone}</Text>
                        </TouchableOpacity>
                    )}

                    {!!place.website && (
                        <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(place.website!)}>
                            <MaterialCommunityIcons name="web" size={20} color="#8AAFB1" />
                            <Text style={[s.infoText, s.infoLink]} numberOfLines={1}>{place.website}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Opening hours */}
                    {hours && hours.length > 0 && (
                        <>
                            <Text style={s.sectionTitle}>Opening hours</Text>
                            <View style={s.hoursCard}>
                                {hours.map(({ day, open, close }) => (
                                    <View key={day} style={s.hoursRow}>
                                        <Text style={s.hoursDay}>{day}</Text>
                                        <Text style={s.hoursTime}>{open} — {close}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Coordinates */}
                    {(!!place.latitude || !!place.longitude) && (
                        <>
                            <Text style={s.sectionTitle}>Location</Text>
                            <Text selectable style={s.desc}>
                                Lat: {place.latitude?.toFixed(5)}  Lng: {place.longitude?.toFixed(5)}
                            </Text>
                        </>
                    )}
                </View>
            </ScrollView>

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
    coverPlaceholder: {
        backgroundColor: "#E6F4F1",
        alignItems: "center",
        justifyContent: "center",
    },
    body: { paddingHorizontal: 16, paddingTop: 16 },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    title: { fontSize: 22, fontWeight: "800", color: "#111", flex: 1, marginRight: 12 },
    ratingBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: { marginLeft: 4, fontSize: 14, fontWeight: "700", color: "#FFB800" },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    categoryBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E6F4F1",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    categoryBadgeText: { fontSize: 12, fontWeight: "700", color: "#3B7D7A", textTransform: "uppercase" },
    openBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    openBadgeOpen: { backgroundColor: "#E6F9EE" },
    openBadgeClosed: { backgroundColor: "#FDE8E8" },
    openBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
    openBadgeTextOpen: { color: "#1E8449" },
    openBadgeTextClosed: { color: "#C0392B" },
    sectionTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
    desc: { fontSize: 14, color: "#444", lineHeight: 20 },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    infoText: { marginLeft: 8, fontSize: 14, color: "#333", flex: 1 },
    infoLink: { color: "#3B7D7A", textDecorationLine: "underline" },
    hoursCard: {
        backgroundColor: "#F8F8F8",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 6,
    },
    hoursRow: { flexDirection: "row", justifyContent: "space-between" },
    hoursDay: { fontSize: 14, color: "#333", fontWeight: "500" },
    hoursTime: { fontSize: 14, color: "#555" },
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
