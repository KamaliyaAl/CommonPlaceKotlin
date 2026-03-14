import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../api";

export default function UsersListScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate("Profile", { userId: item.id })}
    >
      <View style={s.avatar} />
      <View style={s.info}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.email}>{item.email}</Text>
      </View>
      <Text style={s.arrow}>></Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#7FA6FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Users</Text>
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <Text style={s.empty}>No users found</Text>
          }
          refreshing={loading}
          onRefresh={loadProfiles}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  list: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ddd",
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: "700" },
  email: { color: "#666", marginTop: 2 },
  arrow: { fontSize: 20, color: "#ccc", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
