import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PlaceEntry } from "../types";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export type PlacesContextType = {
  favouritePlaces: PlaceEntry[];
  togglePlaceFavourite: (place: PlaceEntry) => void;
  isPlaceFavourite: (id: string) => boolean;
  refreshPlaceFavourites: () => Promise<void>;
};

const PlacesContext = createContext<PlacesContextType | undefined>(undefined);

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favouritePlaces, setFavouritePlaces] = useState<PlaceEntry[]>([]);
  const userId = user?.uid || process.env.EXPO_PUBLIC_USER_ID || "user1";

  const refreshPlaceFavourites = useCallback(async () => {
    try {
      const places = await api.getFavouritePlaces(userId);
      setFavouritePlaces(places);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    refreshPlaceFavourites();
  }, [refreshPlaceFavourites]);

  const togglePlaceFavourite = useCallback((place: PlaceEntry) => {
    setFavouritePlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);

      if (exists) {
        (async () => {
          try {
            await api.removeFavouritePlace(userId, place.id);
          } catch (e) {
            console.error(e);
            setFavouritePlaces((cur) => {
              if (cur.some((p) => p.id === place.id)) return cur;
              return [...cur, place];
            });
          }
        })();
        return prev.filter((p) => p.id !== place.id);
      } else {
        (async () => {
          try {
            await api.addFavouritePlace(userId, place.id);
          } catch (e) {
            console.error(e);
            setFavouritePlaces((cur) => cur.filter((p) => p.id !== place.id));
          }
        })();
        return [...prev, place];
      }
    });
  }, [userId]);

  const isPlaceFavourite = useCallback(
    (id: string) => favouritePlaces.some((p) => p.id === id),
    [favouritePlaces]
  );

  const value = useMemo(
    () => ({ favouritePlaces, togglePlaceFavourite, isPlaceFavourite, refreshPlaceFavourites }),
    [favouritePlaces, togglePlaceFavourite, isPlaceFavourite, refreshPlaceFavourites]
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const ctx = useContext(PlacesContext);
  if (!ctx) throw new Error("usePlaces must be used within PlacesProvider");
  return ctx;
}
