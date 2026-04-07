import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Pressable,
    ScrollView,
    Image,
    Alert,
    FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { useEffect } from "react";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import { useEvents } from "../context/EventsContext";
import { locationStore } from "../store/locationStore";
import { Category } from "../types";
import type { BottomTabParamList } from "../navigation/Tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
    const days: string[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0); // avoid DST shifts
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        days.push(`${yyyy}-${mm}-${dd}`);
    }
    return Array.from(new Set(days)); // ensure unique
};

export default function AddScreen() {
    const days = useMemo(() => getDaysArray(), []);
    const navigation = useNavigation<NativeStackNavigationProp<BottomTabParamList>>();
    const isFocused = useIsFocused();
    const { addEvent } = useEvents();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<Category>("other");
    const [startDate, setStartDate] = useState<string>(days[0]);
    const [endDate, setEndDate] = useState<string>(days[0]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [price, setPrice] = useState("");
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const route = useRoute<any>();

    useEffect(() => {
        if (isFocused && locationStore.selected) {
            setCoord({
                lat: locationStore.selected.latitude,
                lng: locationStore.selected.longitude
            });
            // Clear the store after consumption
            locationStore.selected = null;
        }
    }, [isFocused]);

    const categories: Category[] = ["food", "sport", "nature", "culture", "other"];

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
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const localUri = res.assets[0].uri;

                const formData = new FormData();
                formData.append('file', {
                    uri: localUri,
                    name: 'event.jpg',
                    type: 'image/jpeg',
                } as any);
                formData.append('upload_preset', 'commonplace');

                const uploadRes = await fetch(
                    'https://api.cloudinary.com/v1_1/doxux3r14/image/upload',
                    { method: 'POST', body: formData }
                );
                const uploadData = await uploadRes.json();
                if (uploadData.secure_url) {
                    setImageUri(uploadData.secure_url);
                } else {
                    Alert.alert("Upload failed", "Could not upload image, try again.");
                }
            }
        } catch (e) {
            console.warn(e);
            Alert.alert("Error", "Could not upload the image");
        }
    };

    const onMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setCoord({ lat: latitude, lng: longitude });
    };

    const onCreate = async () => {
        if (!name.trim()) return Alert.alert("Validation", "Please enter event name");
        if (!description.trim()) return Alert.alert("Validation", "Please enter description");
        if (!coord) return Alert.alert("Validation", "Please select a place on the map");

        // Simple validation for time format HH:mm
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (startTime && !timeRegex.test(startTime.trim())) {
            return Alert.alert("Validation", "Start time should be in HH:mm format (e.g. 18:00)");
        }
        if (endTime && !timeRegex.test(endTime.trim())) {
            return Alert.alert("Validation", "End time should be in HH:mm format (e.g. 21:00)");
        }

        const startTimestamp = startTime.trim()
            ? `${startDate}T${startTime.trim()}:00`
            : `${startDate}T00:00:00`;
        const endTimestamp = endTime.trim()
            ? `${endDate}T${endTime.trim()}:00`
            : `${endDate}T23:59:59`;

        try {
            const created = await addEvent({
                title: name.trim(),
                description: description.trim(),
                lat: coord.lat,
                lng: coord.lng,
                category,
                date: startDate,
                startTime: startTimestamp,
                endTime: endTimestamp,
                price: price.trim() || null,
                rating: undefined,
                reviewsCount: undefined,
                imageUri,
            });

            // Navigate to Map and focus selected date
            // @ts-ignore - bottom tabs accept params
            navigation.navigate("Map", { date: startDate });
            Alert.alert("Created", "Your event has been created");
            // reset form optionally
            setName("");
            setDescription("");
            setCategory("other");
            setStartDate(days[0]);
            setEndDate(days[0]);
            setStartTime("");
            setEndTime("");
            setCoord(null);
            setImageUri(null);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to create event");
        }
    };

    const renderCalendarDay = (item: string, current: string, onSelect: (val: string) => void) => {
        const d = new Date(item);
        const dayNum = d.getDate();
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
        const isActive = item === current;

        return (
            <Pressable key={item} onPress={() => onSelect(item)} style={[styles.dayItem, isActive && styles.dayItemActive]}>
                <Text style={[styles.dayWeekday, isActive && styles.dayTextActive]}>{weekday}</Text>
                <Text style={[styles.dayNumber, isActive && styles.dayTextActive]}>{dayNum}</Text>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Create new event</Text>

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
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Event name</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />
                    </View>

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

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Price (€) (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={price}
                            onChangeText={setPrice}
                            placeholder="Free"
                        />
                    </View>

                    {/* Category chips */}
                    <View style={{ marginBottom: 14 }}>
                        <Text style={styles.sectionTitle}>Category</Text>
                        <View style={styles.chipsWrap}>
                            {categories.map((c) => {
                                const active = c === category;
                                return (
                                    <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipActive]}>
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{CATEGORY_LABEL[c]}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Date calendars */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Start Date & Time</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={days}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => renderCalendarDay(item, startDate, setStartDate)}
                            contentContainerStyle={styles.calendarList}
                        />
                        <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                            <TextInput
                                style={styles.input}
                                value={startTime}
                                onChangeText={setStartTime}
                                placeholder="Start Time (e.g. 00:00)"
                            />
                        </View>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>End Date & Time</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={days}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => renderCalendarDay(item, endDate, setEndDate)}
                            contentContainerStyle={styles.calendarList}
                        />
                        <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                            <TextInput
                                style={styles.input}
                                value={endTime}
                                onChangeText={setEndTime}
                                placeholder="End Time (e.g. 23:59)"
                            />
                        </View>
                    </View>

                    {/* Map picker */}
                    <View style={{ width: "100%", marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Place location</Text>
                        <Pressable 
                            style={styles.mapPickerPlaceholder} 
                            onPress={() => {
                                // @ts-ignore
                                navigation.navigate("LocationPicker", {
                                    initialLat: coord?.lat,
                                    initialLng: coord?.lng
                                });
                            }}
                        >
                            <MaterialCommunityIcons name="map-marker-plus" size={32} color="#8AAFB1" />
                            <Text style={styles.mapPickerText}>
                                {coord 
                                    ? `Lat: ${coord.lat.toFixed(4)}, Lng: ${coord.lng.toFixed(4)}`
                                    : "Tap to pick location on map"
                                }
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable style={styles.createBtn} onPress={onCreate}>
                        <Text style={styles.createBtnText}>Create event</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#EBEBEB",
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
    row: {
        flexDirection: "row",
        alignItems: "center",
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
    chipsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
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
    // Calendar styles
    calendarList: {
        paddingHorizontal: 6,
    },
    dayItem: {
        width: 64,
        height: 72,
        marginRight: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#BFCFD1",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    dayItemActive: {
        backgroundColor: "#8AAFB1",
        borderColor: "#8AAFB1",
    },
    dayWeekday: {
        fontSize: 12,
        color: "#6A6A6A",
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginTop: 2,
    },
    dayTextActive: {
        color: "#fff",
    },
    mapPicker: {
        width: "100%",
        height: 160,
        borderRadius: 16,
        overflow: "hidden",
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
    hintText: {
        color: "#6A6A6A",
        marginTop: 6,
        fontSize: 12,
    },
    createBtn: {
        backgroundColor: "#8AAFB1",
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 10,
    },
    createBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});
