import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Pressable,
    Image,
    Alert,
    ActivityIndicator
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { Category, Place, PlaceEntry, PlaceCategory } from "../types";
import { locationStore } from "../store/locationStore";

// --- Opening Hours Types (from CreatePlaceScreen) ---
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
                            />
                            <Text style={oh.timeSep}>—</Text>
                            <TextInput
                                style={oh.timeInput}
                                value={value[d.key]!.close}
                                onChangeText={(t) => updateTime(d.key, "close", t)}
                                placeholder="22:00"
                                maxLength={5}
                            />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

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

const CATEGORY_LABEL: Record<Category, string> = {
    food: "Food",
    sport: "Sport",
    nature: "Nature",
    culture: "Culture",
    other: "Other",
};

const formatEventDate = (dateStr: string) => {
    try {
        const hasTime = dateStr.includes("T");
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Nicosia",
            day: "numeric",
            month: "short",
            year: "numeric",
            ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
};

const getDaysArray = () => {
    const days: string[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let i = 0; i < 30; i++) { // More days for editing
        const date = new Date(today);
        date.setDate(today.getDate() + i - 7); // Show some past days too for context
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        days.push(`${yyyy}-${mm}-${dd}`);
    }
    return Array.from(new Set(days)).sort();
};

export default function OrganizerMenuScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { user } = useAuth();
    const [events, setEvents] = useState<Place[]>([]);
    const [placeEntries, setPlaceEntries] = useState<PlaceEntry[]>([]);
    const [mode, setMode] = useState<"event" | "place">("event");
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Place | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<PlaceEntry | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [placeEditModalVisible, setPlaceEditModalVisible] = useState(false);

    // Common form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Event form states
    const days = useMemo(() => getDaysArray(), []);
    const [category, setCategory] = useState<Category>("other");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [price, setPrice] = useState("");

    // Place form states
    const [placeCategory, setPlaceCategory] = useState<PlaceCategory>("other");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [openingHours, setOpeningHours] = useState<OpeningHoursData>({});
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);

    const categories: Category[] = ["food", "sport", "nature", "culture", "other"];

    useEffect(() => {
        if (isFocused && locationStore.selected) {
            setCoord({
                lat: locationStore.selected.latitude,
                lng: locationStore.selected.longitude,
            });
            locationStore.selected = null;
        }
    }, [isFocused]);

    useEffect(() => {
        fetchMyData();
    }, [user?.uid, mode]);

    const fetchMyData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            if (mode === "event") {
                const data = await api.getEvents({ organizerId: user.uid });
                setEvents(data);
            } else {
                const data = await api.getPlaceEntries({ organizerId: user.uid });
                setPlaceEntries(data);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", `Failed to load your ${mode}s`);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyEvents = fetchMyData;

    const handleEditPress = (event: Place) => {
        setSelectedEvent(event);
        setName(event.title);
        setDescription(event.description);
        setCategory(event.category as Category);
        setPrice(event.price || "");
        setImageUri(event.imageUri);
        
        if (event.startTime && event.startTime.includes('T')) {
            const [d, t] = event.startTime.split('T');
            setStartDate(d);
            setStartTime(t.substring(0, 5));
        } else {
            setStartDate(event.date);
            setStartTime("");
        }

        if (event.endTime && event.endTime.includes('T')) {
            const [d, t] = event.endTime.split('T');
            setEndDate(d);
            setEndTime(t.substring(0, 5));
        } else {
            setEndDate(event.date);
            setEndTime("");
        }

        setEditModalVisible(true);
    };

    const handlePlaceEditPress = (place: PlaceEntry) => {
        setSelectedPlace(place);
        setName(place.name);
        setDescription(place.description || "");
        setPlaceCategory(place.category || "other");
        setAddress(place.address || "");
        setPhone(place.phone || "");
        setWebsite(place.website || "");
        setImageUri(place.imageUri || null);
        setCoord(place.latitude && place.longitude ? { lat: place.latitude, lng: place.longitude } : null);
        
        try {
            if (place.openingHours) {
                setOpeningHours(JSON.parse(place.openingHours));
            } else {
                setOpeningHours({});
            }
        } catch (e) {
            setOpeningHours({});
        }

        setPlaceEditModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!selectedEvent) return;
        if (!name.trim()) return Alert.alert("Validation", "Please enter event name");

        const startTimestamp = startTime.trim()
            ? `${startDate}T${startTime.trim()}:00`
            : `${startDate}T00:00:00`;
        const endTimestamp = endTime.trim()
            ? `${endDate}T${endTime.trim()}:00`
            : `${endDate}T23:59:59`;

        try {
            await api.updateEvent(selectedEvent.id, {
                title: name.trim(),
                description: description.trim(),
                category,
                startTime: startTimestamp,
                endTime: endTimestamp,
                price: price.trim() || null,
                imageUri,
                organizerId: selectedEvent.organizerId,
                geopositionId: selectedEvent.geopositionId
            });
            Alert.alert("Success", "Event updated successfully");
            setEditModalVisible(false);
            fetchMyEvents();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to update event");
        }
    };

    const handlePlaceUpdate = async () => {
        if (!selectedPlace) return;
        if (!name.trim()) return Alert.alert("Validation", "Please enter place name");
        if (!coord) return Alert.alert("Validation", "Please select a location");

        try {
            await api.updatePlaceEntry(selectedPlace.id, {
                name: name.trim(),
                description: description.trim(),
                category: placeCategory,
                address: address.trim(),
                phone: phone.trim(),
                website: website.trim(),
                openingHours: JSON.stringify(openingHours),
                latitude: coord.lat,
                longitude: coord.lng,
                imageUri,
                organizerId: selectedPlace.organizerId
            });
            Alert.alert("Success", "Location updated successfully");
            setPlaceEditModalVisible(false);
            fetchMyData();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to update location");
        }
    };

    const handleDelete = () => {
        if (!selectedEvent) return;
        Alert.alert(
            "Delete Event",
            "Are you sure you want to delete this event? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.deleteEvent(selectedEvent.id);
                            setEditModalVisible(false);
                            fetchMyEvents();
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Failed to delete event");
                        }
                    }
                }
            ]
        );
    };

    const handlePlaceDelete = () => {
        if (!selectedPlace) return;
        Alert.alert(
            "Delete Location",
            "Are you sure you want to delete this location? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.deletePlaceEntry(selectedPlace.id);
                            setPlaceEditModalVisible(false);
                            fetchMyData();
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Failed to delete location");
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const localUri = res.assets[0].uri;
                const formData = new FormData();
                formData.append('file', { uri: localUri, name: 'event.jpg', type: 'image/jpeg' } as any);
                formData.append('upload_preset', 'commonplace');

                const uploadRes = await fetch('https://api.cloudinary.com/v1_1/doxux3r14/image/upload', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.secure_url) setImageUri(uploadData.secure_url);
            }
        } catch (e) {
            console.warn(e);
        }
    };

    const renderCalendarDay = (item: string, current: string, onSelect: (val: string) => void) => {
        const d = new Date(item);
        const dayNum = d.getDate();
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
        const isActive = item === current;

        return (
            <Pressable key={item} onPress={() => onSelect(item)} style={[s.dayItem, isActive && s.dayItemActive]}>
                <Text style={[s.dayWeekday, isActive && s.dayTextActive]}>{weekday}</Text>
                <Text style={[s.dayNumber, isActive && s.dayTextActive]}>{dayNum}</Text>
            </Pressable>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color="#8AAFB1" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#4A4A4A" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Creator Menu</Text>
            </View>

            {/* Toggle Event / Place */}
            <View style={s.toggleRow}>
                <Pressable
                    style={[s.toggleBtn, mode === "event" && s.toggleBtnActive]}
                    onPress={() => setMode("event")}
                >
                    <Text style={[s.toggleBtnText, mode === "event" && s.toggleBtnTextActive]}>Events</Text>
                </Pressable>
                <Pressable
                    style={[s.toggleBtn, mode === "place" && s.toggleBtnActive]}
                    onPress={() => setMode("place")}
                >
                    <Text style={[s.toggleBtnText, mode === "place" && s.toggleBtnTextActive]}>Locations</Text>
                </Pressable>
            </View>

            <FlatList
                data={mode === "event" ? events : placeEntries}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.list}
                renderItem={({ item }) => {
                    if (mode === "event") {
                        const event = item as Place;
                        return (
                            <TouchableOpacity style={s.eventCard} onPress={() => handleEditPress(event)}>
                                {event.imageUri ? (
                                    <Image source={{ uri: event.imageUri }} style={s.eventImage} />
                                ) : (
                                    <View style={[s.eventImage, { backgroundColor: "#ccc", justifyContent: "center", alignItems: "center" }]}>
                                        <MaterialCommunityIcons name="calendar" size={32} color="#fff" />
                                    </View>
                                )}
                                <View style={s.eventInfo}>
                                    <Text style={s.eventTitle}>{event.title}</Text>
                                    <Text style={s.eventDate}>{formatEventDate(event.startTime ?? event.date)}</Text>
                                    <View style={s.catBadge}>
                                        <Text style={s.catText}>{CATEGORY_LABEL[event.category as Category]}</Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="pencil-outline" size={24} color="#8AAFB1" />
                            </TouchableOpacity>
                        );
                    } else {
                        const place = item as PlaceEntry;
                        return (
                            <TouchableOpacity style={s.eventCard} onPress={() => handlePlaceEditPress(place)}>
                                {place.imageUri ? (
                                    <Image source={{ uri: place.imageUri }} style={s.eventImage} />
                                ) : (
                                    <View style={[s.eventImage, { backgroundColor: "#ccc", justifyContent: "center", alignItems: "center" }]}>
                                        <MaterialCommunityIcons name="map-marker" size={32} color="#fff" />
                                    </View>
                                )}
                                <View style={s.eventInfo}>
                                    <Text style={s.eventTitle}>{place.name}</Text>
                                    <Text style={s.eventDate} numberOfLines={1}>{place.address || "No address"}</Text>
                                    <View style={s.catBadge}>
                                        <Text style={s.catText}>
                                            {PLACE_CATEGORY_LABEL[place.category as PlaceCategory] || place.category}
                                        </Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="pencil-outline" size={24} color="#8AAFB1" />
                            </TouchableOpacity>
                        );
                    }
                }}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <MaterialCommunityIcons 
                            name={mode === "event" ? "calendar-blank" : "map-marker-off"} 
                            size={64} 
                            color="#ccc" 
                        />
                        <Text style={s.emptyText}>
                            {mode === "event" 
                                ? "You haven't created any events yet." 
                                : "You haven't created any locations yet."
                            }
                        </Text>
                    </View>
                }
            />

            <Modal visible={editModalVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={s.modalSafe}>
                    <View style={s.modalHeader}>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={28} color="#4A4A4A" />
                        </TouchableOpacity>
                        <Text style={s.modalTitle}>Edit Event</Text>
                        <TouchableOpacity onPress={handleDelete}>
                            <MaterialCommunityIcons name="delete-outline" size={28} color="#dc3545" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={s.modalScroll}>
                        <Pressable style={s.photoArea} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={s.photoPreview} />
                            ) : (
                                <View style={s.photoPlaceholder}>
                                    <View style={s.photoInnerPlaceholder}>
                                        <MaterialCommunityIcons name="camera-plus" size={48} color="#8AAFB1" />
                                        <Text style={s.photoText}>Tap to add photo</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Event Name</Text>
                            <TextInput style={s.input} value={name} onChangeText={setName} />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Description</Text>
                            <TextInput
                                style={[s.input, s.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Price (€)</Text>
                            <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="Free" />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Category</Text>
                            <View style={s.chipsRow}>
                                {categories.map((c) => (
                                    <Pressable 
                                        key={c} 
                                        onPress={() => setCategory(c)} 
                                        style={[s.chip, category === c && s.chipActive]}
                                    >
                                        <Text style={[s.chipText, category === c && s.chipTextActive]}>{CATEGORY_LABEL[c]}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <Text style={s.sectionHeader}>Start Date & Time</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={days}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => renderCalendarDay(item, startDate, setStartDate)}
                            contentContainerStyle={s.calendar}
                        />
                        <TextInput style={[s.input, { marginTop: 10 }]} value={startTime} onChangeText={setStartTime} placeholder="HH:mm" />

                        <Text style={[s.sectionHeader, { marginTop: 20 }]}>End Date & Time</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={days}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => renderCalendarDay(item, endDate, setEndDate)}
                            contentContainerStyle={s.calendar}
                        />
                        <TextInput style={[s.input, { marginTop: 10 }]} value={endTime} onChangeText={setEndTime} placeholder="HH:mm" />

                        <TouchableOpacity style={s.updateBtn} onPress={handleUpdate}>
                            <Text style={s.updateBtnText}>Update Event</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
            <Modal visible={placeEditModalVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={s.modalSafe}>
                    <View style={s.modalHeader}>
                        <TouchableOpacity onPress={() => setPlaceEditModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={28} color="#4A4A4A" />
                        </TouchableOpacity>
                        <Text style={s.modalTitle}>Edit Location</Text>
                        <TouchableOpacity onPress={handlePlaceDelete}>
                            <MaterialCommunityIcons name="delete-outline" size={28} color="#dc3545" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={s.modalScroll}>
                        <Pressable style={s.photoArea} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={s.photoPreview} />
                            ) : (
                                <View style={s.photoPlaceholder}>
                                    <View style={s.photoInnerPlaceholder}>
                                        <MaterialCommunityIcons name="camera-plus" size={48} color="#8AAFB1" />
                                        <Text style={s.photoText}>Tap to add photo</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Location Name</Text>
                            <TextInput style={s.input} value={name} onChangeText={setName} />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Description</Text>
                            <TextInput
                                style={[s.input, s.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Category</Text>
                            <View style={s.chipsRow}>
                                {PLACE_CATEGORIES.map((c) => (
                                    <Pressable 
                                        key={c.value} 
                                        onPress={() => setPlaceCategory(c.value)} 
                                        style={[s.chip, placeCategory === c.value && s.chipActive]}
                                    >
                                        <Text style={[s.chipText, placeCategory === c.value && s.chipTextActive]}>{c.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Address</Text>
                            <TextInput style={s.input} value={address} onChangeText={setAddress} />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Phone</Text>
                            <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Website</Text>
                            <TextInput style={s.input} value={website} onChangeText={setWebsite} keyboardType="url" />
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Opening Hours</Text>
                            <View style={ohCard.card}>
                                <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
                            </View>
                        </View>

                        <View style={s.formGroup}>
                            <Text style={s.label}>Map Location</Text>
                            <Pressable 
                                style={[s.input, { justifyContent: "center", alignItems: "center" }]} 
                                onPress={() => navigation.navigate("Map", { isSelecting: true })}
                            >
                                <Text style={{ color: coord ? "#8AAFB1" : "#ccc" }}>
                                    {coord ? `Location selected: ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}` : "Select on map"}
                                </Text>
                            </Pressable>
                        </View>

                        <TouchableOpacity style={s.updateBtn} onPress={handlePlaceUpdate}>
                            <Text style={s.updateBtnText}>Update Location</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const oh = StyleSheet.create({
    presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    presetBtn: { backgroundColor: "#eee", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    presetBtnText: { fontSize: 12, color: "#666" },
    presetBtnClear: { backgroundColor: "#fee" },
    presetBtnClearText: { color: "#c00" },
    dayRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
    dayChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#8AAFB1", justifyContent: "center", alignItems: "center" },
    dayChipActive: { backgroundColor: "#8AAFB1" },
    dayChipText: { fontSize: 12, color: "#8AAFB1" },
    dayChipTextActive: { color: "#fff", fontWeight: "700" },
    timeTable: { gap: 10 },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    timeRowLabel: { flex: 1, fontSize: 14, color: "#4A4A4A" },
    timeInput: { width: 60, height: 32, backgroundColor: "#fff", borderWidth: 1, borderColor: "#8AAFB1", borderRadius: 8, textAlign: "center", fontSize: 13 },
    timeSep: { color: "#8AAFB1" },
});

const ohCard = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#8AAFB1",
        padding: 16,
    }
});

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#EBEBEB" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerRow: { 
        flexDirection: "row", 
        alignItems: "center", 
        padding: 16, 
        backgroundColor: "#fff",
        borderBottomWidth: 1, 
        borderBottomColor: "#eee" 
    },
    backBtn: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: "#4A4A4A" },
    toggleRow: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
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
    list: { padding: 16 },
    eventCard: { 
        flexDirection: "row", 
        alignItems: "center", 
        backgroundColor: "#fff", 
        borderRadius: 16, 
        padding: 12, 
        marginBottom: 16, 
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    eventImage: { width: 70, height: 70, borderRadius: 12 },
    eventInfo: { flex: 1, marginLeft: 16 },
    eventTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
    eventDate: { fontSize: 14, color: "#777", marginTop: 4 },
    catBadge: { alignSelf: "flex-start", marginTop: 6, backgroundColor: "#E6F0F1", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
    catText: { fontSize: 12, color: "#8AAFB1", fontWeight: "600" },
    emptyContainer: { alignItems: "center", marginTop: 100 },
    emptyText: { marginTop: 16, color: "#999", fontSize: 16 },
    
    // Modal
    modalSafe: { flex: 1, backgroundColor: "#EBEBEB" },
    modalHeader: { 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: 16, 
        backgroundColor: "#fff",
        borderBottomWidth: 1, 
        borderBottomColor: "#eee" 
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: "#4A4A4A" },
    modalScroll: { padding: 20, paddingBottom: 40 },
    photoArea: { 
        width: "100%", 
        height: 180, 
        borderRadius: 20, 
        overflow: "hidden", 
        marginBottom: 20, 
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#BFCFD1",
        borderStyle: "dashed"
    },
    photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
    photoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
    photoInnerPlaceholder: { alignItems: "center" },
    photoText: { marginTop: 8, color: "#8AAFB1", fontWeight: "600" },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, color: "#8AAFB1", fontWeight: "600", marginBottom: 8 },
    input: { borderWidth: 1.5, borderColor: "#BFCFD1", borderRadius: 12, padding: 12, fontSize: 16, color: "#333", backgroundColor: "#fff" },
    textArea: { height: 100, textAlignVertical: "top" },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#BFCFD1", backgroundColor: "#fff" },
    chipActive: { backgroundColor: "#8AAFB1", borderColor: "#8AAFB1" },
    chipText: { color: "#666" },
    chipTextActive: { color: "#fff", fontWeight: "700" },
    sectionHeader: { fontSize: 16, fontWeight: "700", color: "#4A4A4A", marginBottom: 12 },
    dayItem: { width: 60, height: 70, marginRight: 8, borderRadius: 12, borderWidth: 1, borderColor: "#BFCFD1", justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
    dayItemActive: { backgroundColor: "#8AAFB1", borderColor: "#8AAFB1" },
    dayWeekday: { fontSize: 10, color: "#999" },
    dayNumber: { fontSize: 16, fontWeight: "700" },
    dayTextActive: { color: "#fff" },
    calendar: { paddingBottom: 10 },
    updateBtn: { backgroundColor: "#8AAFB1", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 30 },
    updateBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" }
});
