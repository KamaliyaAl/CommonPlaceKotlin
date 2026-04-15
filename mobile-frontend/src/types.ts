export type Category = "food" | "sport" | "nature" | "culture" | "other";

export type Review = {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  rating: number; // 1–5
  reviewText: string;
  adviceText?: string;
  timestamp?: string;
};

export type PlaceCategory = "restaurant" | "cafe" | "bar" | "gym" | "park" | "museum" | "gallery" | "hotel" | "shop" | "other";

export type PlaceEntry = {
  id: string;
  name: string;
  description?: string;
  category?: PlaceCategory;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  latitude?: number;
  longitude?: number;
  imageUri?: string | null;
  organizerId?: string;
};

export type Place = {
  id: string;
  title: string;
  description: string;
  rating?: number;
  reviewsCount?: number;
  lat: number;
  lng: number;
  category: Category;
  date: string; // ISO format "YYYY-MM-DD"
  startTime?: string | null;
  endTime?: string | null;
  imageUri?: string | null;
  price?: string | null;
  liked?: boolean;
  organizerId?: string | null;
};
