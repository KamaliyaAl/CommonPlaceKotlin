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

import { api } from "../api";

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
  currentInterests,
  onClose,
  onAddInterest,
  onRemoveInterest,
}: {
  visible: boolean;
  currentInterests: any[];
  onClose: () => void;
  onAddInterest: (id: string) => void;
  onRemoveInterest: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [allStack, setAllStack] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      api.getInterests().then(setAllStack).catch(console.error);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentIds = currentInterests.map(i => i.id);
    return allStack.filter(s => 
      s.interestName.toLowerCase().includes(q) && !currentIds.includes(s.id)
    );
  }, [query, allStack, currentInterests]);

  async function handleAdd(id: string) {
    onAddInterest(id);
    setQuery("");
  }

  async function handleCreateNew() {
    const q = query.trim();
    if (!q) return;
    try {
      const newInterest = await api.createInterest(q);
      // Refresh list to include new interest
      const updated = await api.getInterests();
      setAllStack(updated);
      onAddInterest(newInterest.id);
      setQuery("");
    } catch (err) {
      console.error("Failed to create interest:", err);
    }
  }

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStack.find(s => s.interestName.toLowerCase() === q);
  }, [query, allStack]);

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
                  <Text style={s.closeText}>Done</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search interests..."
                style={s.input}
                returnKeyType="done"
              />

              <Text style={s.section}>My Interests</Text>
              <View style={s.chipsWrap}>
                {currentInterests.length === 0 ? (
                  <Text style={s.emptyText}>No interests yet</Text>
                ) : null}
                {currentInterests.map((x) => (
                  <Chip key={x.id} label={x.interestName} onRemove={() => onRemoveInterest(x.id)} />
                ))}
              </View>

              <Text style={s.section}>Available from Stack</Text>
              <ScrollView
                style={s.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
              >
                <View style={s.suggestionsWrap}>
                  {filtered.map((x) => (
                    <TouchableOpacity
                      key={x.id}
                      onPress={() => handleAdd(x.id)}
                      style={s.suggestionItem}
                    >
                      <Text style={s.suggestionTitle}>{x.interestName}</Text>
                      <Text style={s.suggestionSub}>Tap to add</Text>
                    </TouchableOpacity>
                  ))}
                  
                  {query.trim().length > 0 && !exactMatch && (
                    <TouchableOpacity
                      onPress={handleCreateNew}
                      style={[s.suggestionItem, { backgroundColor: "#7FA6FF33" }]}
                    >
                      <Text style={[s.suggestionTitle, { color: "#7FA6FF" }]}>
                        Create "{query.trim()}"
                      </Text>
                      <Text style={s.suggestionSub}>Add as new interest to system</Text>
                    </TouchableOpacity>
                  )}

                  {filtered.length === 0 && !query.trim() && (
                    <Text style={s.emptyText}>No matching interests available</Text>
                  )}
                </View>
              </ScrollView>
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
});