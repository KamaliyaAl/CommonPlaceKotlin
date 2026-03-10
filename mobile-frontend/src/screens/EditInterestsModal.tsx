import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

const SUGGESTIONS = [
  "Swimming", "Running", "Reading", "Volleyball", "Dancing",
  "Gym", "Yoga", "Cycling", "Hiking", "Cooking", "Photography",
];

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={s.chipX}>
          <Text style={s.chipXText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function EditInterestsModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(initial);

  useEffect(() => {
    if (visible) {
      setSelected(initial);
      setQuery("");
    }
  }, [visible, initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? SUGGESTIONS.filter((x) => x.toLowerCase().includes(q))
      : SUGGESTIONS;
    return base.filter((x) => !selected.includes(x));
  }, [query, selected]);

  function addInterest(name: string) {
    const clean = name.trim();
    if (!clean) return;
    if (selected.includes(clean)) return;
    setSelected((prev) => [...prev, clean]);
    setQuery("");
  }

  function removeInterest(name: string) {
    setSelected((prev) => prev.filter((x) => x !== name));
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={s.backdrop}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "flex-end" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View style={s.card}>
              <View style={s.headerRow}>
                <Text style={s.title}>Edit interests</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Text style={s.closeText}>Close</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Type an interest (e.g., 'Tennis')"
                style={s.input}
                onSubmitEditing={() => addInterest(query)}
                returnKeyType="done"
              />

              <TouchableOpacity style={s.addBtn} onPress={() => addInterest(query)}>
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>

              <Text style={s.section}>Selected</Text>
              <View style={s.chipsWrap}>
                {selected.length === 0 ? (
                  <Text style={s.emptyText}>No interests yet</Text>
                ) : null}
                {selected.map((x) => (
                  <Chip key={x} label={x} onRemove={() => removeInterest(x)} />
                ))}
              </View>

              <Text style={s.section}>Suggestions</Text>
              <ScrollView
                style={s.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
              >
                <View style={s.suggestionsWrap}>
                  {filtered.map((x) => (
                    <TouchableOpacity
                      key={x}
                      onPress={() => addInterest(x)}
                      style={s.suggestionItem}
                    >
                      <Text style={s.suggestionTitle}>{x}</Text>
                      <Text style={s.suggestionSub}>Tap to add</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={s.footerRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={() => onSave(selected)}>
                  <Text style={s.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  kav: {
    width: "100%",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "900" },
  closeBtn: { padding: 8 },
  closeText: { color: "#333", fontWeight: "700" },

  input: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  addBtn: {
    backgroundColor: "black",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  addBtnText: { color: "white", fontWeight: "900" },

  section: { marginTop: 14, marginBottom: 8, fontSize: 16, fontWeight: "900" },

  emptyText: { color: "#666" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#999",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipText: { color: "white", fontWeight: "800" },
  chipX: {
    marginLeft: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  chipXText: { color: "white", fontWeight: "900" },

  suggestionsScroll: { maxHeight: 180 },
  suggestionsWrap: { gap: 10, paddingBottom: 10 },
  suggestionItem: { backgroundColor: "#f2f2f2", padding: 12, borderRadius: 12 },
  suggestionTitle: { fontWeight: "700" },
  suggestionSub: { color: "#666" },

  footerRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelText: { fontWeight: "900" },
  saveBtn: {
    flex: 1,
    backgroundColor: "black",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "white", fontWeight: "900" },
});