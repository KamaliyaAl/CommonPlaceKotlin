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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { Category, Place } from "../types";

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
    const navigation = useNavigation();
    const { user } = useAuth();
    const [events, setEvents] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Place | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    // Form states
    const days = useMemo(() => getDaysArray(), []);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<Category>("other");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [price, setPrice] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);

    const categories: Category[] = ["food", "sport", "nature", "culture", "other"];

    useEffect(() => {
        fetchMyEvents();
    }, [user?.uid]);

    const fetchMyEvents = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const data = await api.getEvents({ organizerId: user.uid });
            setEvents(data);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load your events");
        } finally {
            setLoading(false);
        }
    };

    const handleEditPress = (event: Place) => {
        setSelectedEvent(event);
        setName(event.title);
        setDescription(event.description);
        setCategory(event.category as Category);
        setPrice(event.price || "");
        setImageUri(event.imageUri);
        
        // Parse dates and times
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
                <Text style={s.headerTitle}>Organizer Menu</Text>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.list}
                renderItem={({ item }) => (
                    <TouchableOpacity style={s.eventCard} onPress={() => handleEditPress(item)}>
                        {item.imageUri ? (
                            <Image source={{ uri: item.imageUri }} style={s.eventImage} />
                        ) : (
                            <View style={[s.eventImage, { backgroundColor: "#ccc", justifyContent: "center", alignItems: "center" }]}>
                                <MaterialCommunityIcons name="calendar" size={32} color="#fff" />
                            </View>
                        )}
                        <View style={s.eventInfo}>
                            <Text style={s.eventTitle}>{item.title}</Text>
                            <Text style={s.eventDate}>{item.date}</Text>
                            <View style={s.catBadge}>
                                <Text style={s.catText}>{CATEGORY_LABEL[item.category as Category]}</Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="pencil-outline" size={24} color="#8AAFB1" />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <MaterialCommunityIcons name="calendar-blank" size={64} color="#ccc" />
                        <Text style={s.emptyText}>You haven't created any events yet.</Text>
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
        </SafeAreaView>
    );
}

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
