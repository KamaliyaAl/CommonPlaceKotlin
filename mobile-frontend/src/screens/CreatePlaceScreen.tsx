import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    Image,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { locationStore } from "../store/locationStore";
import { api } from "../api";
import type { PlaceCategory } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DaySchedule = { open: string; close: string };
type OpeningHoursData = Partial<Record<DayKey, DaySchedule>>;

const ALL_DAYS: { key: DayKey; label: string; short: string }[] = [
    { key: "mon", label: "Monday",    short: "Mo" },
    { key: "tue", label: "Tuesday",   short: "Tu" },
    { key: "wed", label: "Wednesday", short: "We" },
    { key: "thu", label: "Thursday",  short: "Th" },
    { key: "fri", label: "Friday",    short: "Fr" },
    { key: "sat", label: "Saturday",  short: "Sa" },
    { key: "sun", label: "Sunday",    short: "Su" },
];

const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const DEFAULT_SCHEDULE: DaySchedule = { open: "09:00", close: "22:00" };

// ─── Opening Hours Component ──────────────────────────────────────────────────

function OpeningHoursEditor({
    value,
    onChange,
}: {
    value: OpeningHoursData;
    onChange: (v: OpeningHoursData) => void;
}) {
    const toggleDay = (key: DayKey) => {
        if (value[key]) {
            const next = { ...value };
            delete next[key];
            onChange(next);
        } else {
            onChange({ ...value, [key]: { ...DEFAULT_SCHEDULE } });
        }
    };

    const updateTime = (key: DayKey, field: "open" | "close", text: string) => {
        onChange({ ...value, [key]: { ...value[key]!, [field]: text } });
    };

    const applyPreset = (keys: DayKey[]) => {
        const next: OpeningHoursData = { ...value };
        keys.forEach((k) => { next[k] = { ...DEFAULT_SCHEDULE }; });
        onChange(next);
    };

    const activeDays = ALL_DAYS.filter((d) => !!value[d.key]);

    return (
        <View>
            {/* Preset buttons */}
            <View style={oh.presetRow}>
                <Pressable style={oh.presetBtn} onPress={() => applyPreset(WEEKDAYS)}>
                    <Text style={oh.presetBtnText}>Weekdays</Text>
                </Pressable>
                <Pressable style={oh.presetBtn} onPress={() => applyPreset(ALL_DAYS.map((d) => d.key))}>
                    <Text style={oh.presetBtnText}>Every day</Text>
                </Pressable>
                <Pressable style={[oh.presetBtn, oh.presetBtnClear]} onPress={() => onChange({})}>
                    <Text style={[oh.presetBtnText, oh.presetBtnClearText]}>Clear</Text>
                </Pressable>
            </View>

            {/* Day chips */}
            <View style={oh.dayRow}>
                {ALL_DAYS.map((d) => {
                    const active = !!value[d.key];
                    return (
                        <Pressable
                            key={d.key}
                            onPress={() => toggleDay(d.key)}
                            style={[oh.dayChip, active && oh.dayChipActive]}
                        >
                            <Text style={[oh.dayChipText, active && oh.dayChipTextActive]}>
                                {d.short}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Time rows for enabled days */}
            {activeDays.length > 0 && (
                <View style={oh.timeTable}>
                    {activeDays.map((d) => (
                        <View key={d.key} style={oh.timeRow}>
                            <Text style={oh.timeRowLabel}>{d.label}</Text>
                            <TextInput
                                style={oh.timeInput}
                                value={value[d.key]!.open}
                                onChangeText={(t) => updateTime(d.key, "open", t)}
                                placeholder="09:00"
                                maxLength={5}
                                keyboardType="numbers-and-punctuation"
                            />
                            <Text style={oh.timeSep}>—</Text>
                            <TextInput
                                style={oh.timeInput}
                                value={value[d.key]!.close}
                                onChangeText={(t) => updateTime(d.key, "close", t)}
                                placeholder="22:00"
                                maxLength={5}
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── Place categories ─────────────────────────────────────────────────────────

const PLACE_CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
    { value: "restaurant", label: "Restaurant", icon: "silverware-fork-knife" },
    { value: "cafe",       label: "Cafe",       icon: "coffee" },
    { value: "bar",        label: "Bar",        icon: "glass-cocktail" },
    { value: "gym",        label: "Gym",        icon: "dumbbell" },
    { value: "park",       label: "Park",       icon: "tree" },
    { value: "museum",     label: "Museum",     icon: "bank" },
    { value: "gallery",    label: "Gallery",    icon: "image-frame" },
    { value: "hotel",      label: "Hotel",      icon: "bed" },
    { value: "shop",       label: "Shop",       icon: "shopping" },
    { value: "other",      label: "Other",      icon: "map-marker" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatePlaceScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<PlaceCategory>("other");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [openingHours, setOpeningHours] = useState<OpeningHoursData>({});
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isFocused && locationStore.selected) {
            setCoord({
                lat: locationStore.selected.latitude,
                lng: locationStore.selected.longitude,
            });
            locationStore.selected = null;
        }
    }, [isFocused]);

    const pickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert("Permission required", "Allow access to your photos to select an image.");
                return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });
            if (!res.canceled && res.assets?.length) {
                const formData = new FormData();
                formData.append("file", {
                    uri: res.assets[0].uri,
                    name: "place.jpg",
                    type: "image/jpeg",
                } as any);
                formData.append("upload_preset", "commonplace");
                const uploadRes = await fetch(
                    "https://api.cloudinary.com/v1_1/doxux3r14/image/upload",
                    { method: "POST", body: formData }
                );
                const data = await uploadRes.json();
                if (data.secure_url) {
                    setImageUri(data.secure_url);
                } else {
                    Alert.alert("Upload failed", "Could not upload image.");
                }
            }
        } catch (e) {
            console.warn(e);
            Alert.alert("Error", "Could not upload the image");
        }
    };

    const validateTime = (t: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);

    const onCreate = async () => {
        if (!name.trim()) return Alert.alert("Validation", "Please enter place name");
        if (!coord) return Alert.alert("Validation", "Please select a location on the map");

        // Validate all time fields
        for (const [day, sched] of Object.entries(openingHours)) {
            if (!validateTime(sched.open) || !validateTime(sched.close)) {
                return Alert.alert("Validation", `Invalid time for ${day}. Use HH:mm format.`);
            }
        }

        const hoursJson = Object.keys(openingHours).length > 0
            ? JSON.stringify(openingHours)
            : undefined;

        setLoading(true);
        try {
            await api.addPlaceEntry({
                name: name.trim(),
                description: description.trim() || undefined,
                category,
                address: address.trim() || undefined,
                phone: phone.trim() || undefined,
                website: website.trim() || undefined,
                openingHours: hoursJson,
                latitude: coord.lat,
                longitude: coord.lng,
                imageUri,
                organizerId: undefined,
            });

            Alert.alert("Created", "Place has been added successfully");
            setName("");
            setDescription("");
            setCategory("other");
            setAddress("");
            setPhone("");
            setWebsite("");
            setOpeningHours({});
            setCoord(null);
            setImageUri(null);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to create place");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* Toggle Event / Place */}
            <View style={styles.toggleRow}>
                <Pressable style={styles.toggleBtn} onPress={() => navigation.navigate("AddMain")}>
                    <Text style={styles.toggleBtnText}>Event</Text>
                </Pressable>
                <View style={[styles.toggleBtn, styles.toggleBtnActive]}>
                    <Text style={[styles.toggleBtnText, styles.toggleBtnTextActive]}>Place</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Add new place</Text>

                {/* Photo */}
                <Pressable style={styles.photoUploadArea} onPress={pickImage}>
                    <View style={styles.photoUploadDashed}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                        ) : (
                            <MaterialCommunityIcons name="image-outline" size={160} color="#8AAFB1" />
                        )}
                    </View>
                </Pressable>

                <View style={styles.inputContainer}>
                    {/* Name */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Place name *</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />
                    </View>

                    {/* Category chips */}
                    <View style={{ marginBottom: 14 }}>
                        <Text style={styles.sectionTitle}>Category</Text>
                        <View style={styles.chipsWrap}>
                            {PLACE_CATEGORIES.map((c) => {
                                const active = c.value === category;
                                return (
                                    <Pressable
                                        key={c.value}
                                        onPress={() => setCategory(c.value)}
                                        style={[styles.chip, active && styles.chipActive]}
                                    >
                                        <MaterialCommunityIcons
                                            name={c.icon as any}
                                            size={14}
                                            color={active ? "#fff" : "#4A4A4A"}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                            {c.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Address */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Address</Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="e.g. 12 Makariou Ave, Limassol"
                        />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+357 25 000 000"
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Website */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Website</Text>
                        <TextInput
                            style={styles.input}
                            value={website}
                            onChangeText={setWebsite}
                            placeholder="https://example.com"
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Opening hours */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.sectionTitle}>Opening hours</Text>
                        <View style={styles.ohCard}>
                            <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
                        </View>
                    </View>

                    {/* Location picker */}
                    <View style={{ width: "100%", marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Location *</Text>
                        <Pressable
                            style={styles.mapPickerPlaceholder}
                            onPress={() =>
                                navigation.navigate("LocationPicker", {
                                    initialLat: coord?.lat,
                                    initialLng: coord?.lng,
                                })
                            }
                        >
                            <MaterialCommunityIcons name="map-marker-plus" size={32} color="#8AAFB1" />
                            <Text style={styles.mapPickerText}>
                                {coord
                                    ? `Lat: ${coord.lat.toFixed(4)}, Lng: ${coord.lng.toFixed(4)}`
                                    : "Tap to pick location on map"}
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={[styles.createBtn, loading && styles.createBtnDisabled]}
                        onPress={onCreate}
                        disabled={loading}
                    >
                        <Text style={styles.createBtnText}>{loading ? "Saving..." : "Add place"}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Opening hours styles ─────────────────────────────────────────────────────

const oh = StyleSheet.create({
    presetRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    presetBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 14,
        backgroundColor: "#8AAFB1",
    },
    presetBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    presetBtnClear: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#BFCFD1",
    },
    presetBtnClearText: {
        color: "#8AAFB1",
    },
    dayRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 12,
    },
    dayChip: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: "#BFCFD1",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    dayChipActive: {
        backgroundColor: "#8AAFB1",
        borderColor: "#8AAFB1",
    },
    dayChipText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#5A5A5A",
    },
    dayChipTextActive: {
        color: "#fff",
    },
    timeTable: {
        gap: 8,
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timeRowLabel: {
        width: 90,
        fontSize: 13,
        color: "#4A4A4A",
        fontWeight: "500",
    },
    timeInput: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: "#8AAFB1",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 14,
        color: "#4A4A4A",
        backgroundColor: "#fff",
        textAlign: "center",
    },
    timeSep: {
        fontSize: 16,
        color: "#8AAFB1",
        fontWeight: "600",
    },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#EBEBEB",
    },
    toggleRow: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#8AAFB1",
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        backgroundColor: "#fff",
    },
    toggleBtnActive: {
        backgroundColor: "#8AAFB1",
    },
    toggleBtnText: {
        fontWeight: "600",
        color: "#8AAFB1",
        fontSize: 15,
    },
    toggleBtnTextActive: {
        color: "#fff",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: "center",
    },
    header: {
        fontSize: 24,
        fontWeight: "700",
        color: "#4A4A4A",
        marginTop: 20,
        marginBottom: 30,
    },
    photoUploadArea: {
        width: "100%",
        aspectRatio: 16 / 9,
        marginBottom: 30,
    },
    photoUploadDashed: {
        flex: 1,
        borderWidth: 2,
        borderColor: "#8AAFB1",
        borderStyle: "dashed",
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
        overflow: "hidden",
    },
    photoPreview: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
        borderRadius: 38,
    },
    inputContainer: {
        width: "100%",
    },
    inputWrapper: {
        marginBottom: 20,
        position: "relative",
    },
    label: {
        position: "absolute",
        top: -10,
        left: 20,
        backgroundColor: "#EBEBEB",
        paddingHorizontal: 5,
        zIndex: 1,
        fontSize: 14,
        color: "#8AAFB1",
    },
    input: {
        borderWidth: 2,
        borderColor: "#8AAFB1",
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 16,
        color: "#4A4A4A",
        minHeight: 50,
        backgroundColor: "#FFFFFF",
    },
    textArea: {
        height: 120,
        borderRadius: 30,
        paddingTop: 15,
    },
    sectionTitle: {
        marginBottom: 8,
        color: "#4A4A4A",
        fontWeight: "600",
    },
    ohCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#8AAFB1",
        padding: 16,
    },
    chipsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#8AAFB1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#fff",
    },
    chipActive: {
        backgroundColor: "#8AAFB1",
        borderColor: "#8AAFB1",
    },
    chipText: {
        color: "#4A4A4A",
    },
    chipTextActive: {
        color: "#fff",
        fontWeight: "700",
    },
    mapPickerPlaceholder: {
        width: "100%",
        paddingVertical: 20,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#8AAFB1",
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
    },
    mapPickerText: {
        marginTop: 8,
        color: "#8AAFB1",
        fontWeight: "600",
    },
    createBtn: {
        backgroundColor: "#8AAFB1",
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 10,
    },
    createBtnDisabled: {
        opacity: 0.6,
    },
    createBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});
