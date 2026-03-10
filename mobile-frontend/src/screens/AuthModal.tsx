import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthContext";

export default function AuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function onPrimary() {
    if (mode === "signin") await signInEmail(email, password);
    else await signUpEmail(email, password, name);
    onClose();
  }

  async function onGoogle() {
    await signInGoogle(); // потом будет Firebase Google Auth
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.switchRow}>
            <TouchableOpacity style={[s.switchBtn, mode === "signin" && s.switchBtnActive]} onPress={() => setMode("signin")}>
              <Text style={[s.switchText, mode === "signin" && s.switchTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.switchBtn, mode === "signup" && s.switchBtnActive]} onPress={() => setMode("signup")}>
              <Text style={[s.switchText, mode === "signup" && s.switchTextActive]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {mode === "signup" && (
            <TextInput value={name} onChangeText={setName} placeholder="Name" style={s.input} />
          )}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={s.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={s.input} />

          <TouchableOpacity style={s.primary} onPress={onPrimary}>
            <Text style={s.primaryText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.google} onPress={onGoogle}>
            <Text style={s.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.close} onPress={onClose}>
            <Text style={s.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  card: { backgroundColor: "white", padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  switchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#eee", alignItems: "center" },
  switchBtnActive: { backgroundColor: "black" },
  switchText: { fontWeight: "700", color: "#333" },
  switchTextActive: { color: "white" },
  input: { backgroundColor: "#f2f2f2", padding: 12, borderRadius: 12, marginTop: 10 },
  primary: { backgroundColor: "black", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 14 },
  primaryText: { color: "white", fontWeight: "800" },
  google: { backgroundColor: "#f2f2f2", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 10 },
  googleText: { fontWeight: "800", color: "#111" },
  close: { padding: 12, alignItems: "center", marginTop: 6 },
  closeText: { color: "#555" },
});