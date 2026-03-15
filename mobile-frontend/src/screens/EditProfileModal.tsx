import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { User } from "../auth/AuthContext";

interface EditProfileModalProps {
  visible: boolean;
  user: User;
  onClose: () => void;
  onUpdate: (patch: Partial<User>) => Promise<void>;
}

export default function EditProfileModal({ visible, user, onClose, onUpdate }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(user.age?.toString() || "");
  const [gender, setGender] = useState<boolean | undefined>(user.gender);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(user.name);
      setAge(user.age?.toString() || "");
      setGender(user.gender);
    }
  }, [visible, user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        name,
        age: parseInt(age) || undefined,
        gender
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Edit Profile</Text>
          
          <ScrollView>
            <Text style={s.label}>Name</Text>
            <TextInput 
              value={name} 
              onChangeText={setName} 
              placeholder="Name" 
              style={s.input} 
            />

            <Text style={s.label}>Age</Text>
            <TextInput 
              value={age} 
              onChangeText={setAge} 
              placeholder="Age" 
              keyboardType="numeric" 
              style={s.input} 
            />

            <Text style={s.label}>Gender</Text>
            <View style={s.genderRow}>
              <TouchableOpacity 
                style={[s.genderBtn, gender === true && s.genderBtnActive]} 
                onPress={() => setGender(true)}
              >
                <Text style={[s.genderText, gender === true && s.genderTextActive]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.genderBtn, gender === false && s.genderBtnActive]} 
                onPress={() => setGender(false)}
              >
                <Text style={[s.genderText, gender === false && s.genderTextActive]}>Male</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[s.primary, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={s.primaryText}>{loading ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.close} onPress={onClose} disabled={loading}>
              <Text style={s.closeText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  card: { 
    backgroundColor: "white", 
    padding: 16, 
    borderTopLeftRadius: 18, 
    borderTopRightRadius: 18,
    maxHeight: '80%'
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center"
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginLeft: 4
  },
  input: { 
    backgroundColor: "#f2f2f2", 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 6 
  },
  genderRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  genderBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: "#f2f2f2", alignItems: "center" },
  genderBtnActive: { backgroundColor: "black" },
  genderText: { fontWeight: "600", color: "#333" },
  genderTextActive: { color: "white" },
  primary: { backgroundColor: "black", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 24 },
  primaryText: { color: "white", fontWeight: "800" },
  close: { padding: 12, alignItems: "center", marginTop: 6, marginBottom: 10 },
  closeText: { color: "#555", fontWeight: "600" },
});
