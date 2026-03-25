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
} from "react-native";
import { useEvents } from "../context/EventsContext";

export default function FavouritesScreen() {
  const { favourites, refreshFavourites } = useEvents();
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      // Refresh favourites when screen is focused
      refreshFavourites();
    }, [refreshFavourites])
  );

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Favourites</Text>

      <FlatList
        data={favourites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={favourites.length === 0 ? s.emptyWrap : s.list}
        ListEmptyComponent={
          <Text style={s.emptyText}>No favourite events yet</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={s.thumb} />
            ) : (
              <View style={s.thumb} />
            )}

            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDesc}>{item.description}</Text>
            </View>
          </View>
        )}
      />
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#D9D9D9",
    padding: 14,
    marginBottom: 14,
  },
  thumb: {
    width: 64,
    height: 64,
    backgroundColor: "#777",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  cardDesc: {
    marginTop: 4,
    color: "#222",
  },

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