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
import { useAuth } from "../auth/AuthContext";
import { useEvents } from "../context/EventsContext";
import { api } from "../api";
import { Review } from "../types";

const RATING_EMOJIS = ["😠", "😢", "😐", "🙂", "😄"];

function getRatingEmoji(rating: number): string {
  return RATING_EMOJIS[Math.min(Math.max(Math.round(rating) - 1, 0), 4)];
}

function ReviewCard({ review }: { review: Review }) {
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

export default function ReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { events, toggleFavourite, isFavourite } = useEvents();

  const eventId: string = route.params?.eventId ?? "";
  const event = events.find((e) => e.id === eventId);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [sortBy, setSortBy] = useState<"rating" | "date">("date");
  const [visibleCount, setVisibleCount] = useState(3);

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [adviceText, setAdviceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const data = await api.getReviews(eventId, sortBy);
      setReviews(data);
    } catch {
      // non-critical — keep empty list
    } finally {
      setLoadingReviews(false);
    }
  }, [eventId, sortBy]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : event?.rating ?? 0;

  const reviewsCount = event?.reviewsCount ?? reviews.length;

  const onSubmit = async () => {
    if (!selectedRating) {
      Alert.alert("Pick a rating", "Tap an emoji to rate the event.");
      return;
    }
    if (!reviewText.trim()) {
      Alert.alert("Write a review", "Please share your experience.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitReview({
        eventId,
        userId: user?.uid ?? "anonymous",
        userName: user?.name ?? "Anonymous",
        rating: selectedRating,
        reviewText: reviewText.trim(),
        adviceText: adviceText.trim() || undefined,
      });
      setSelectedRating(null);
      setReviewText("");
      setAdviceText("");
      await loadReviews();
      Alert.alert("Thanks!", "Your review has been submitted.");
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
            {event?.imageUri ? (
              <Image source={{ uri: event.imageUri }} style={s.coverImg} resizeMode="cover" />
            ) : (
              <View style={[s.coverImg, { backgroundColor: "#B0B0B0" }]} />
            )}
            <View style={s.coverDim} />

            <TouchableOpacity
              style={s.heartBtn}
              onPress={() => event && toggleFavourite(event)}
            >
              <MaterialCommunityIcons
                name={event && isFavourite(event.id) ? "heart" : "heart-outline"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={s.coverTextWrap}>
              <Text style={s.coverTitle} numberOfLines={2}>{event?.title ?? ""}</Text>
              <Text style={s.coverDesc} numberOfLines={3}>{event?.description ?? ""}</Text>
            </View>

            <View style={s.coverBottom}>
              <TouchableOpacity style={s.coverPill}>
                <Text style={s.coverPillText}>View other photos</Text>
              </TouchableOpacity>
              <View style={s.ratingPill}>
                <Text style={s.ratingPillText}>
                  {avgRating.toFixed(1)}  ({reviewsCount} reviews)
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

          {/* Leave review */}
          <View style={s.leaveSection}>
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

            <TextInput
              style={s.input}
              placeholder="Write us what you liked and didn't like here..."
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={3}
              value={reviewText}
              onChangeText={setReviewText}
            />
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Share the advise here..."
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={2}
              value={adviceText}
              onChangeText={setAdviceText}
            />

            <View style={s.bottomRow}>
              <TouchableOpacity style={s.addPhotoBtn}>
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#111" />
                <Text style={s.addPhotoText}>Add photos</Text>
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
  coverBottom: { position: "absolute", bottom: 12, left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coverPill: { backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  coverPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
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
  reviewMeta: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ratingNum: { fontSize: 14, fontWeight: "800", color: "#111" },
  ratingEmoji: { fontSize: 17, marginLeft: 4 },
  replyBtn: { marginLeft: "auto", paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: "#CECECE" },
  replyText: { fontSize: 13, color: "#111", fontWeight: "600" },

  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginVertical: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#CECECE" },
  showMoreText: { fontSize: 14, color: "#111", fontWeight: "600", marginRight: 4 },

  leaveSection: { paddingHorizontal: 16, marginTop: 16 },
  leaveHeader: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 4 },
  leaveHeaderText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  emojiRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  emojiBtn: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" },
  emojiBtnActive: { backgroundColor: "#E0E0E0", borderWidth: 2, borderColor: "#111" },
  emojiText: { fontSize: 26 },

  input: { borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#111", minHeight: 54, textAlignVertical: "top" },

  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  addPhotoBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: "#CECECE" },
  addPhotoText: { marginLeft: 6, fontSize: 14, color: "#111", fontWeight: "600" },
  submitBtn: { backgroundColor: "#111", paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, minWidth: 90, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  backBtn: { position: "absolute", left: 16, right: 16, bottom: 14, height: 52, borderRadius: 999, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  backText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
