import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { locationStore } from "../store/locationStore";

const LIMASSOL: Region = {
  latitude: 34.7071,
  longitude: 33.0226,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function LocationPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [lat, setLat] = useState<string>(
    route.params?.initialLat?.toString() || LIMASSOL.latitude.toString()
  );
  const [lng, setLng] = useState<string>(
    route.params?.initialLng?.toString() || LIMASSOL.longitude.toString()
  );

  const [region, setRegion] = useState<Region>({
    latitude: parseFloat(lat) || LIMASSOL.latitude,
    longitude: parseFloat(lng) || LIMASSOL.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLat(latitude.toFixed(6));
    setLng(longitude.toFixed(6));
  };

  const handleSave = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) return;

    locationStore.selected = { latitude, longitude };
    navigation.goBack();
  };

  // Sync marker when inputs change
  useEffect(() => {
    const l = parseFloat(lat);
    const g = parseFloat(lng);
    if (!isNaN(l) && !isNaN(g)) {
      setRegion((prev) => ({
        ...prev,
        latitude: l,
        longitude: g,
      }));
    }
  }, [lat, lng]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Pick Location</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>Select</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={lat}
            onChangeText={setLat}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputWrap, { marginLeft: 10 }]}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={lng}
            onChangeText={setLng}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          onRegionChangeComplete={setRegion}
        >
          <Marker
            coordinate={{
              latitude: parseFloat(lat) || 0,
              longitude: parseFloat(lng) || 0,
            }}
          />
        </MapView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#7FA6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  inputWrap: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
