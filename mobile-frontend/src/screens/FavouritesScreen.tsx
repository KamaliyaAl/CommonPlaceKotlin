import React, { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEvents } from "../context/EventsContext";
import { usePlaces } from "../context/PlacesContext";

export default function FavouritesScreen() {
  const { favourites, refreshFavourites, toggleFavourite, isFavourite } = useEvents();
  const { favouritePlaces, refreshPlaceFavourites, togglePlaceFavourite, isPlaceFavourite } = usePlaces();
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      refreshFavourites();
      refreshPlaceFavourites();
    }, [refreshFavourites, refreshPlaceFavourites])
  );

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Favourites</Text>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Events ── */}
        <Text style={s.sectionHeader}>Events</Text>
        {favourites.length === 0 ? (
          <Text style={s.emptyText}>No favourite events yet</Text>
        ) : (
          favourites.map((item) => (
            <View key={item.id} style={s.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                activeOpacity={0.8}
                style={s.cardMain}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={s.thumb} />
                ) : (
                  <View style={s.thumb} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardDesc}>{item.description}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heartAbsolute}
                onPress={() => toggleFavourite(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={isFavourite(item.id) ? "heart" : "heart-outline"}
                  size={26}
                  color={isFavourite(item.id) ? "#C0392B" : "#111"}
                />
              </TouchableOpacity>

              <View style={s.cardBottomRow}>
                <View style={s.ratingWrap}>
                  <Text style={s.ratingText}>
                    {(item.rating || 0).toFixed(1)} ({item.reviewsCount || 0} review{(item.reviewsCount || 0) === 1 ? "" : "s"})
                  </Text>
                  <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color="#111" />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('Map', {
                      screen: 'MapMain',
                      params: { eventId: item.id, latitude: item.lat, longitude: item.lng },
                    });
                  }}
                >
                  <Text style={s.mapText}>Show on the map</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ── Places ── */}
        <Text style={[s.sectionHeader, { marginTop: 24 }]}>Places</Text>
        {favouritePlaces.length === 0 ? (
          <Text style={s.emptyText}>No favourite places yet</Text>
        ) : (
          favouritePlaces.map((item) => (
            <View key={item.id} style={s.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PlaceDetails', { placeId: item.id })}
                activeOpacity={0.8}
                style={s.cardMain}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={s.thumb} />
                ) : (
                  <View style={[s.thumb, s.thumbPlaceholder]}>
                    <MaterialCommunityIcons name="map-marker" size={28} color="#8AAFB1" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  {!!item.description && (
                    <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                  {!!item.address && (
                    <Text style={s.cardMeta} numberOfLines={1}>{item.address}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heartAbsolute}
                onPress={() => togglePlaceFavourite(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={isPlaceFavourite(item.id) ? "heart" : "heart-outline"}
                  size={26}
                  color={isPlaceFavourite(item.id) ? "#C0392B" : "#111"}
                />
              </TouchableOpacity>

              {(!!item.latitude || !!item.longitude) && (
                <View style={s.cardBottomRow}>
                  <View />
                  <TouchableOpacity
                    onPress={() =>
                      (navigation as any).navigate("Map", {
                        screen: "MapMain",
                        params: {
                          placeId: item.id,
                          latitude: item.latitude,
                          longitude: item.longitude,
                        },
                      })
                    }
                  >
                    <Text style={s.mapText}>Show on the map</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#D9D9D9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardMain: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 36,
  },
  thumb: {
    width: 64,
    height: 64,
    backgroundColor: "#777",
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: "#E6F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  cardDesc: {
    marginTop: 4,
    color: "#222",
    fontSize: 13,
  },
  cardMeta: {
    marginTop: 4,
    color: "#555",
    fontSize: 12,
  },
  heartAbsolute: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 2,
    zIndex: 10,
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingText: { color: "#111", fontWeight: "700" },
  mapText: { color: "#222", fontWeight: "700", textAlign: "right" },
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
