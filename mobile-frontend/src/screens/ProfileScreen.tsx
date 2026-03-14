import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useIsFocused, useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, User } from "../auth/AuthContext";
import AuthModal from "./AuthModal"; // если файл рядом в src/screens
import EditInterestsModal from "./EditInterestsModal";
import { api } from "../api";

function Pill({ label }: { label: string }) {
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user: currentUser, loading: authLoading, signOut, updateProfile } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const userId = route.params?.userId;
  const isMe = !userId || userId === currentUser?.uid;

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [editInterestsVisible, setEditInterestsVisible] = useState(false);
  const isFocused = useIsFocused();
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    if (userId && userId !== currentUser?.uid) {
      fetchTargetUser(userId);
    } else {
      setTargetUser(null);
    }
  }, [userId, currentUser]);

  const fetchTargetUser = async (id: string) => {
    setFetchingUser(true);
    try {
      const data = await api.getProfile(id);
      // Map backend Profile to frontend User type
      setTargetUser({
        uid: data.id,
        name: data.name,
        email: data.email,
        age: data.age,
        gender: data.gender,
        interests: [], // Backend might not return interests yet in this call
        friendsCount: 0
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    } finally {
      setFetchingUser(false);
    }
  };

  const user = isMe ? currentUser : targetUser;

  useEffect(() => {
    if (isFocused && !authLoading && !currentUser && isMe) setAuthVisible(true);
  }, [isFocused, authLoading, currentUser, isMe]);

  if (authLoading || fetchingUser) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7FA6FF" />
          <Text style={{ marginTop: 10 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          {!isMe ? (
            <>
              <Text style={{ marginBottom: 12 }}>User not found</Text>
              <TouchableOpacity style={s.blackBtn} onPress={() => navigation.goBack()}>
                <Text style={s.blackBtnText}>Go Back</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ marginBottom: 12 }}>Please sign in</Text>
              <TouchableOpacity style={s.blackBtn} onPress={() => setAuthVisible(true)}>
                <Text style={s.blackBtnText}>Sign in / Sign up</Text>
              </TouchableOpacity>
              <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {isMe && (
          <>
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
          </>
        )}

        <View style={s.topRow}>
          {!isMe && (
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Text style={s.backBtnText}>←</Text>
            </TouchableOpacity>
          )}
          <View style={s.avatarWrap}>
            <View style={s.avatar} />
            <View style={s.badge} />
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{user.name}</Text>
              {isMe && (
                <TouchableOpacity style={s.iconBtn}>
                  <Text style={s.icon}>⚙️</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={s.line}>Email: {user.email}</Text>
            <Text style={s.line}>Age: {user.age ?? "-"}</Text>
            <Text style={s.line}>Gender: {user.gender === true ? "Male" : user.gender === false ? "Female" : "-"}</Text>
            <Text style={s.line}>City: {user.city ?? "-"}</Text>

            {isMe && (
              <TouchableOpacity style={s.editSmall}>
                <Text style={s.editSmallText}>Edit ✎</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.midRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Interests:</Text>

            <View style={s.pillsWrap}>
              {(user.interests ?? []).map((it: string) => (
                <Pill key={it} label={it} />
              ))}
              {(user.interests ?? []).length === 0 && (
                <Text style={{ color: "#999" }}>No interests yet</Text>
              )}
            </View>

            {isMe && (
              <TouchableOpacity style={s.editBig} onPress={() => setEditInterestsVisible(true)}>
                <Text style={s.editBigText}>Edit ✎</Text>
              </TouchableOpacity>
            )}
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

        {isMe && (
          <TouchableOpacity style={[s.blackBtn, { marginTop: "auto" }]} onPress={signOut}>
            <Text style={s.blackBtnText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  container: { flex: 1, backgroundColor: "white", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  backBtn: { marginBottom: 10, padding: 5 },
  backBtnText: { fontSize: 24, fontWeight: "bold" },
  topRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  avatarWrap: { width: 120, height: 120 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#ddd" },
  badge: { position: "absolute", right: 10, top: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: "black" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 22, fontWeight: "800", flex: 1 },
  iconBtn: { padding: 6 },
  icon: { fontSize: 18 },
  line: { marginTop: 4, color: "#222", fontSize: 14 },
  editSmall: { marginTop: 10, alignSelf: "flex-start", backgroundColor: "black", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  editSmallText: { color: "white", fontWeight: "700", fontSize: 12 },
  midRow: { flexDirection: "row", marginTop: 28, gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { backgroundColor: "#999", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  pillText: { color: "white", fontWeight: "700", fontSize: 12 },
  editBig: { marginTop: 16, alignSelf: "flex-start", backgroundColor: "black", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  editBigText: { color: "white", fontWeight: "800", fontSize: 14 },
  friends: { width: 120, alignItems: "flex-start" },
  circles: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ddd", borderWidth: 2, borderColor: "#fff" },
  blackBtn: { backgroundColor: "black", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, alignItems: "center" },
  blackBtnText: { color: "white", fontWeight: "800" },
});