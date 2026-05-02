import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../auth/AuthContext";
import { usePlaces } from "../context/PlacesContext";
import { api } from "../api";
import type { PlaceEntry, PlaceReview } from "../types";

const RATING_EMOJIS = ["😠", "😢", "😐", "🙂", "😄"];

function getRatingEmoji(rating: number): string {
  return RATING_EMOJIS[Math.min(Math.max(Math.round(rating) - 1, 0), 4)];
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewLeft}>
        <MaterialCommunityIcons name="account-circle" size={44} color="#9A9A9A" />
        <Text style={s.reviewerName} numberOfLines={1}>{review.userName}</Text>
      </View>

      <View style={s.reviewRight}>
        <Text style={s.reviewBody}>
          <Text style={s.reviewLabel}>Review: </Text>
          {review.reviewText}
        </Text>
        {!!review.adviceText && (
          <Text style={[s.reviewBody, { marginTop: 3 }]}>
            <Text style={s.reviewLabel}>Advise: </Text>
            {review.adviceText}
          </Text>
        )}
        {!!review.imageUri && (
          <Image source={{ uri: review.imageUri }} style={s.reviewPhoto} resizeMode="cover" />
        )}
        <View style={s.reviewMeta}>
          <Text style={s.ratingNum}>{review.rating.toFixed(1)}</Text>
          <Text style={s.ratingEmoji}>{getRatingEmoji(review.rating)}</Text>
          <TouchableOpacity style={s.replyBtn}>
            <Text style={s.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function PlaceReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { togglePlaceFavourite, isPlaceFavourite } = usePlaces();

  const placeId: string = route.params?.placeId ?? "";

  const [place, setPlace] = useState<PlaceEntry | null>(null);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [sortBy, setSortBy] = useState<"rating" | "date">("date");
  const [visibleCount, setVisibleCount] = useState(3);

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [adviceText, setAdviceText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  useEffect(() => {
    api.getPlaceEntries().then((all: PlaceEntry[]) => {
      setPlace(all.find((p) => p.id === placeId) ?? null);
    }).catch(console.error);
  }, [placeId]);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const data = await api.getPlaceReviews(placeId, sortBy);
      setReviews(data);

      // Pre-fill form if user already has a review
      const mine = data.find((r) => r.userId === (user?.uid ?? ""));
      if (mine) {
        setExistingReviewId(mine.id);
        setSelectedRating(Math.round(mine.rating));
        setReviewText(mine.reviewText);
        setAdviceText(mine.adviceText ?? "");
        setPhotoUri(mine.imageUri ?? null);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingReviews(false);
    }
  }, [placeId, sortBy, user?.uid]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Allow access to your photos.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.length) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", {
          uri: res.assets[0].uri,
          name: "review.jpg",
          type: "image/jpeg",
        } as any);
        formData.append("upload_preset", "commonplace");
        const uploadRes = await fetch(
          "https://api.cloudinary.com/v1_1/doxux3r14/image/upload",
          { method: "POST", body: formData }
        );
        const data = await uploadRes.json();
        if (data.secure_url) {
          setPhotoUri(data.secure_url);
        } else {
          Alert.alert("Upload failed", "Could not upload photo.");
        }
      }
    } catch {
      Alert.alert("Error", "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async () => {
    if (!selectedRating) {
      Alert.alert("Pick a rating", "Tap an emoji to rate the place.");
      return;
    }
    if (!reviewText.trim()) {
      Alert.alert("Write a review", "Please share your experience.");
      return;
    }
    setSubmitting(true);
    const payload = {
      placeId,
      userId: user?.uid ?? "anonymous",
      userName: user?.name ?? "Anonymous",
      rating: selectedRating,
      reviewText: reviewText.trim(),
      adviceText: adviceText.trim() || undefined,
      imageUri: photoUri,
    };
    try {
      if (existingReviewId) {
        await api.updatePlaceReview(existingReviewId, payload);
        Alert.alert("Updated!", "Your review has been updated.");
      } else {
        await api.submitPlaceReview(payload);
        Alert.alert("Thanks!", "Your review has been submitted.");
      }
      await loadReviews();
    } catch {
      Alert.alert("Error", "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleReviews = reviews.slice(0, visibleCount);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Cover */}
          <View style={s.coverWrap}>
            {place?.imageUri ? (
              <Image source={{ uri: place.imageUri }} style={s.coverImg} resizeMode="cover" />
            ) : (
              <View style={[s.coverImg, { backgroundColor: "#8AAFB1" }]} />
            )}
            <View style={s.coverDim} />

            {place && (
              <TouchableOpacity
                style={s.heartBtn}
                onPress={() => togglePlaceFavourite(place)}
              >
                <MaterialCommunityIcons
                  name={isPlaceFavourite(place.id) ? "heart" : "heart-outline"}
                  size={26}
                  color="#fff"
                />
              </TouchableOpacity>
            )}

            <View style={s.coverTextWrap}>
              <Text style={s.coverTitle} numberOfLines={2}>{place?.name ?? ""}</Text>
              <Text style={s.coverDesc} numberOfLines={3}>{place?.description ?? ""}</Text>
            </View>

            <View style={s.coverBottom}>
              <View style={s.ratingPill}>
                <Text style={s.ratingPillText}>
                  {avgRating.toFixed(1)}  ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                </Text>
                <Text style={{ fontSize: 15, marginLeft: 4 }}>😊</Text>
              </View>
            </View>
          </View>

          {/* Filter bar */}
          <View style={s.filterRow}>
            <Text style={s.filterLabel}>Filter by:</Text>
            {(["rating", "date"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.filterBtn, sortBy === opt && s.filterBtnOn]}
                onPress={() => setSortBy(opt)}
              >
                <Text style={[s.filterBtnText, sortBy === opt && s.filterBtnTextOn]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Review list */}
          {loadingReviews ? (
            <ActivityIndicator style={{ marginVertical: 28 }} color="#111" />
          ) : reviews.length === 0 ? (
            <Text style={s.emptyText}>No reviews yet. Be the first!</Text>
          ) : (
            <>
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
              {visibleCount < reviews.length && (
                <TouchableOpacity
                  style={s.showMoreBtn}
                  onPress={() => setVisibleCount((n) => n + 5)}
                >
                  <Text style={s.showMoreText}>Show more</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#111" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Leave / edit review */}
          <View style={s.leaveSection}>
            <Text style={s.leaveSectionTitle}>
              {existingReviewId ? "Edit your review" : "Leave a review"}
            </Text>
            {/* Emoji rating */}
            <View style={s.emojiRow}>
              {RATING_EMOJIS.map((emoji, idx) => {
                const rating = idx + 1;
                const active = selectedRating === rating;
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[s.emojiBtn, active && s.emojiBtnActive]}
                    onPress={() => setSelectedRating(rating)}
                  >
                    <Text style={s.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Review text */}
            <TextInput
              style={s.input}
              placeholder="Write what you liked and didn't like here..."
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={3}
              value={reviewText}
              onChangeText={setReviewText}
            />

            {/* Advice text */}
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Share advice for other visitors..."
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={2}
              value={adviceText}
              onChangeText={setAdviceText}
            />

            {/* Photo preview */}
            {photoUri && (
              <View style={s.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={s.photoRemove} onPress={() => setPhotoUri(null)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom row: add photo + submit */}
            <View style={s.bottomRow}>
              <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#111" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#111" />
                    <Text style={s.addPhotoText}>{photoUri ? "Change photo" : "Add photo"}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.submitBtn} onPress={onSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 96 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingBottom: 20 },

  coverWrap: { height: 230, position: "relative" },
  coverImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.40)" },
  heartBtn: { position: "absolute", top: 14, left: 14, padding: 4 },
  coverTextWrap: { position: "absolute", top: 48, left: 14, right: 50 },
  coverTitle: { color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 28 },
  coverDesc: { color: "#fff", fontSize: 13, marginTop: 6, lineHeight: 18, opacity: 0.9 },
  coverBottom: { position: "absolute", bottom: 12, left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  ratingPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  ratingPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#111", marginRight: 10 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#CECECE", marginRight: 8 },
  filterBtnOn: { backgroundColor: "#111", borderColor: "#111" },
  filterBtnText: { fontSize: 13, color: "#555" },
  filterBtnTextOn: { color: "#fff", fontWeight: "700" },

  emptyText: { textAlign: "center", marginVertical: 28, color: "#999", fontSize: 14 },

  reviewCard: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F2F2F2" },
  reviewLeft: { width: 54, alignItems: "center", marginRight: 12 },
  reviewerName: { fontSize: 12, color: "#444", marginTop: 2, textAlign: "center" },
  reviewRight: { flex: 1 },
  reviewBody: { fontSize: 13, color: "#333", lineHeight: 19 },
  reviewLabel: { fontWeight: "700", color: "#111" },
  reviewPhoto: { width: "100%", height: 140, borderRadius: 10, marginTop: 8 },
  reviewMeta: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ratingNum: { fontSize: 14, fontWeight: "800", color: "#111" },
  ratingEmoji: { fontSize: 17, marginLeft: 4 },
  replyBtn: { marginLeft: "auto", paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: "#CECECE" },
  replyText: { fontSize: 13, color: "#111", fontWeight: "600" },

  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginVertical: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#CECECE" },
  showMoreText: { fontSize: 14, color: "#111", fontWeight: "600", marginRight: 4 },

  leaveSection: { paddingHorizontal: 16, marginTop: 16 },
  leaveSectionTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 4 },

  emojiRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  emojiBtn: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" },
  emojiBtnActive: { backgroundColor: "#E0E0E0", borderWidth: 2, borderColor: "#111" },
  emojiText: { fontSize: 26 },

  input: { borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#111", minHeight: 54, textAlignVertical: "top" },

  photoPreviewWrap: { marginTop: 10, position: "relative" },
  photoPreview: { width: "100%", height: 160, borderRadius: 12 },
  photoRemove: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12 },

  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  addPhotoBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: "#CECECE" },
  addPhotoText: { marginLeft: 6, fontSize: 14, color: "#111", fontWeight: "600" },
  submitBtn: { backgroundColor: "#111", paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, minWidth: 90, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  backBtn: { position: "absolute", left: 16, right: 16, bottom: 14, height: 52, borderRadius: 999, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  backText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
