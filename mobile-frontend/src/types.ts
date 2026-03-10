export type Category = "food" | "sport" | "nature" | "culture" | "other";

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
  imageUri?: string | null;
};
