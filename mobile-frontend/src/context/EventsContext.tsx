import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { Place } from "../types";
import { api } from "../api";

const getDaysArray = () => {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
};

const days = getDaysArray();

export type EventsContextType = {
  events: Place[];
  favourites: Place[];
  addEvent: (e: Omit<Place, "id">) => Promise<Place>;
  toggleFavourite: (event: Place) => void;
  isFavourite: (id: string) => boolean;
  refreshFavourites: () => Promise<void>;
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

const initialEvents: Place[] = [
  {
    id: "1",
    title: "Beach Club ABOBA",
    description: "Short description what is going on",
    rating: 4.9,
    reviewsCount: 101,
    lat: 34.6816,
    lng: 32.9995,
    category: "food",
    date: days[0],
    imageUri: null,
  },
  {
    id: "2",
    title: "Basketball Court",
    description: "Nice public court, usually active evenings",
    rating: 4.6,
    reviewsCount: 32,
    lat: 34.7009,
    lng: 33.0412,
    category: "sport",
    date: days[0],
    imageUri: null,
  },
  {
    id: "3",
    title: "Viewpoint Spot",
    description: "Sunset is great here",
    rating: 4.8,
    reviewsCount: 18,
    lat: 34.725,
    lng: 33.006,
    category: "nature",
    date: days[1],
    imageUri: null,
  },
  {
    id: "4",
    title: "Small Gallery",
    description: "Local exhibitions on weekends",
    rating: 4.5,
    reviewsCount: 12,
    lat: 34.7079,
    lng: 33.0204,
    category: "culture",
    date: days[1],
    imageUri: null,
  },
  {
    id: "5",
    title: "Hidden Spot",
    description: "Just a cool place someone marked",
    rating: 4.2,
    reviewsCount: 5,
    lat: 34.712,
    lng: 33.035,
    category: "other",
    date: days[2],
    imageUri: null,
  },
  {
    id: "6",
    title: "Wine Festival",
    description: "Annual wine festival in Limassol",
    rating: 4.7,
    reviewsCount: 250,
    lat: 34.678,
    lng: 33.045,
    category: "culture",
    date: days[2],
    imageUri: null,
  },
];

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Place[]>([]);
  const [favourites, setFavourites] = useState<Place[]>([]);
  // TODO: replace with real authenticated user id when auth is implemented
  const userId = process.env.EXPO_PUBLIC_USER_ID || "user1";

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error);
  }, []);

  const refreshFavourites = useCallback(async () => {
    try {
      const favs = await api.getFavouriteEvents(userId);
      setFavourites(favs);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    refreshFavourites();
  }, [refreshFavourites]);

  const addEvent = useCallback(async (e: Omit<Place, "id">): Promise<Place> => {
    const created = await api.addEvent(e);
    setEvents((prev) => [created, ...prev]);
    return created;
  }, []);

  const toggleFavourite = useCallback((event: Place) => {
    setFavourites((prev) => {
      const exists = prev.some((item) => item.id === event.id);

      // Optimistic update
      if (exists) {
        // Remove locally then call backend
        (async () => {
          try {
            await api.removeFavouriteEvent(userId, event.id);
          } catch (e) {
            console.error(e);
            // Revert on failure
            setFavourites((cur) => {
              if (cur.some((i) => i.id === event.id)) return cur; // already reverted by another action
              return [...cur, event];
            });
          }
        })();
        return prev.filter((item) => item.id !== event.id);
      } else {
        // Add locally then call backend
        (async () => {
          try {
            await api.addFavouriteEvent(userId, event.id);
          } catch (e) {
            console.error(e);
            // Revert on failure
            setFavourites((cur) => cur.filter((i) => i.id !== event.id));
          }
        })();
        return [...prev, event];
      }
    });
  }, [userId]);

  const isFavourite = useCallback(
    (id: string) => favourites.some((item) => item.id === id),
    [favourites]
  );

  const value = useMemo(
    () => ({
      events,
      favourites,
      addEvent,
      toggleFavourite,
      isFavourite,
      refreshFavourites,
    }),
    [events, favourites, addEvent, toggleFavourite, isFavourite, refreshFavourites]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}