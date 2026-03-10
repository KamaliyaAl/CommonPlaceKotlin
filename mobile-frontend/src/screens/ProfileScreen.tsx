import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "./AuthModal"; // если файл рядом в src/screens
import EditInterestsModal from "./EditInterestsModal";

function Pill({ label }: { label: string }) {
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, loading, signOut, updateProfile } = useAuth();
  const [editInterestsVisible, setEditInterestsVisible] = useState(false);
  const isFocused = useIsFocused();
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    if (isFocused && !loading && !user) setAuthVisible(true);
  }, [isFocused, loading, user]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={{ marginBottom: 12 }}>Please sign in</Text>
          <TouchableOpacity style={s.blackBtn} onPress={() => setAuthVisible(true)}>
            <Text style={s.blackBtnText}>Sign in / Sign up</Text>
          </TouchableOpacity>

          <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
        <EditInterestsModal
          visible={editInterestsVisible}
          initial={user.interests ?? []}
          onClose={() => setEditInterestsVisible(false)}
          onSave={async (next) => {
            await updateProfile({ interests: next });
            setEditInterestsVisible(false);
          }}
        />

        <View style={s.topRow}>
          <View style={s.avatarWrap}>
            <View style={s.avatar} />
            <View style={s.badge} />
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name}>{user.name}</Text>
              <TouchableOpacity style={s.iconBtn}>
                <Text style={s.icon}>⚙️</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.line}>Email: {user.email}</Text>
            <Text style={s.line}>Age: {user.age ?? "-"}</Text>
            <Text style={s.line}>Gender: {user.gender ?? "-"}</Text>
            <Text style={s.line}>City: {user.city ?? "-"}</Text>

            <TouchableOpacity style={s.editSmall}>
              <Text style={s.editSmallText}>Edit ✎</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.midRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Interests:</Text>

            <View style={s.pillsWrap}>
              {(user.interests ?? []).map((it: string) => (
                <Pill key={it} label={it} />
              ))}
            </View>

            <TouchableOpacity style={s.editBig} onPress={() => setEditInterestsVisible(true)}>
              <Text style={s.editBigText}>Edit ✎</Text>
            </TouchableOpacity>
          </View>

          <View style={s.friends}>
            <Text style={s.sectionTitle}>Friends: {user.friendsCount ?? 0}</Text>
            <View style={s.circles}>
              <View style={s.circle} />
              <View style={[s.circle, { marginLeft: -14 }]} />
              <View style={[s.circle, { marginLeft: -14, justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ fontWeight: "700" }}>+10</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[s.blackBtn, { marginTop: "auto" }]} onPress={signOut}>
          <Text style={s.blackBtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" }, // ✅ вот этого не хватало

  container: { flex: 1, backgroundColor: "white", padding: 16 }, // ✅ убрали paddingTop: 40
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  topRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  avatarWrap: { width: 160, height: 160 },
  avatar: { width: 160, height: 160, borderRadius: 999, backgroundColor: "#ddd" },
  badge: { position: "absolute", right: 18, top: 18, width: 18, height: 18, borderRadius: 9, backgroundColor: "black" },

  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 26, fontWeight: "800" },
  iconBtn: { padding: 6 },
  icon: { fontSize: 18 },

  line: { marginTop: 6, color: "#222" },
  editSmall: { marginTop: 10, alignSelf: "flex-start", backgroundColor: "black", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  editSmallText: { color: "white", fontWeight: "700" },

  midRow: { flexDirection: "row", marginTop: 28, gap: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10 },

  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { backgroundColor: "#999", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  pillText: { color: "white", fontWeight: "700" },

  editBig: { marginTop: 16, alignSelf: "flex-start", backgroundColor: "black", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16 },
  editBigText: { color: "white", fontWeight: "800" },

  friends: { width: 140, alignItems: "flex-start" },
  circles: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  circle: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#ddd", borderWidth: 2, borderColor: "#fff" },

  blackBtn: { backgroundColor: "black", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, alignItems: "center" },
  blackBtnText: { color: "white", fontWeight: "800" },
});