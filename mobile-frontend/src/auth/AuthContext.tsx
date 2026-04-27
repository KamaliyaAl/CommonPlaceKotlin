import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

export type User = {
  uid: string;
  name: string;
  email: string;
  age?: number;
  gender?: boolean;
  photoURL?: string;
  interests?: string[];
  friendsCount?: number;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string, age?: number, gender?: boolean) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "auth_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // загрузка "сессии"
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(u: User | null) {
    if (!u) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    }
    setUser(u);
  }

  const signInEmail = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/profiles/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to sign in');
    }

    const profile = await response.json();
    await persist({
      uid: profile.id,
      name: profile.name,
      email: profile.email,
      age: profile.age,
      gender: profile.gender,
      password: profile.password,
      photoURL: profile.photoURL ?? undefined
    } as any);
  };

  const signUpEmail = async (email: string, password: string, name: string, age?: number, gender?: boolean) => {
    const response = await fetch(`${API_URL}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, age, gender })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to sign up');
    }

    const profile = await response.json();
    await persist({
      uid: profile.id,
      name: profile.name,
      email: profile.email,
      age: profile.age,
      gender: profile.gender,
      password: profile.password,
      photoURL: profile.photoURL ?? undefined
    } as any);
  };

  const signInGoogle = async () => {
    await persist({ uid: "mock-google", name: "Google User", email: "google.user@example.com" });
  };

  const signOut = async () => {
    await persist(null);
  };

  const updateProfile = async (patch: Partial<User>) => {
    if (!user) return;
    const response = await fetch(`${API_URL}/profiles/${user.uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.uid,
        name: patch.name ?? user.name ?? "",
        email: user.email ?? "",
        age: patch.age !== undefined ? patch.age : user.age,
        gender: patch.gender !== undefined ? patch.gender : (user.gender ?? false),
        password: (user as any).password || "",
        photoURL: patch.photoURL !== undefined ? patch.photoURL : (user.photoURL ?? null)
      })
    });

    if (response.ok) {
      const next = { ...user, ...patch };
      await persist(next);
    } else {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update profile');
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInEmail, signUpEmail, signInGoogle, signOut, updateProfile }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}