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
import { useNavigation } from "@react-navigation/native";
import { useEvents } from "../context/EventsContext";
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
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push(date.toISOString().split("T")[0]);
    }
    return days;
};

export default function AddScreen() {
    const days = useMemo(() => getDaysArray(), []);
    const navigation = useNavigation<NativeStackNavigationProp<BottomTabParamList>>();
    const { addEvent } = useEvents();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<Category>("other");
    const [selectedDate, setSelectedDate] = useState<string>(days[0]);
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);

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
                quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                setImageUri(res.assets[0].uri);
            }
        } catch (e) {
            console.warn(e);
            Alert.alert("Error", "Could not open the image gallery");
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

        try {
            const created = await addEvent({
                title: name.trim(),
                description: description.trim(),
                lat: coord.lat,
                lng: coord.lng,
                category,
                date: selectedDate,
                rating: undefined,
                reviewsCount: undefined,
                imageUri,
            });

            // Navigate to Map and focus selected date
            // @ts-ignore - bottom tabs accept params
            navigation.navigate("Map", { date: selectedDate });
            Alert.alert("Created", "Your event has been created");
            // reset form optionally
            setName("");
            setDescription("");
            setCategory("other");
            setSelectedDate(days[0]);
            setCoord(null);
            setImageUri(null);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to create event");
        }
    };

    const renderCalendarDay = ({ item }: { item: string }) => {
        const d = new Date(item);
        const dayNum = d.getDate();
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
        const isActive = item === selectedDate;

        return (
            <Pressable onPress={() => setSelectedDate(item)} style={[styles.dayItem, isActive && styles.dayItemActive]}>
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

                    {/* Date calendar */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Date</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={days}
                            keyExtractor={(item) => item}
                            renderItem={renderCalendarDay}
                            contentContainerStyle={styles.calendarList}
                        />
                    </View>

                    {/* Map picker */}
                    <View style={{ width: "100%", height: 220, marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Pick location</Text>
                        <MapView
                            provider={PROVIDER_DEFAULT}
                            style={styles.mapPicker}
                            initialRegion={LIMASSOL}
                            onPress={onMapPress}
                        >
                            {coord && (
                                <Marker coordinate={{ latitude: coord.lat, longitude: coord.lng }} />
                            )}
                        </MapView>
                        {!coord && (
                            <Text style={styles.hintText}>Tap on the map to set event location</Text>
                        )}
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
        aspectRatio: 1,
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
