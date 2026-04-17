import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';

const BANNER_DURATION_MS = 4_000;

export default function NotificationBanner() {
  const { bannerQueue, dismissBanner, markRead } = useNotifications();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = bannerQueue[0] ?? null;

  useEffect(() => {
    if (!current) return;

    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    // Auto-dismiss after BANNER_DURATION_MS
    timerRef.current = setTimeout(() => {
      slideOut();
    }, BANNER_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current?.id]);

  const slideOut = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      dismissBanner();
      translateY.setValue(-120);
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (current) markRead(current.id);
    slideOut();
  };

  if (!current) return null;

  return (
    <Animated.View style={[s.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={s.inner} onPress={handlePress} activeOpacity={0.9}>
        <View style={s.iconWrap}>
          <MaterialCommunityIcons name="bell" size={22} color="#fff" />
        </View>
        <View style={s.textWrap}>
          <Text style={s.title} numberOfLines={1}>{current.eventTitle}</Text>
          <Text style={s.body} numberOfLines={2}>{current.text}</Text>
        </View>
        <TouchableOpacity onPress={slideOut} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <MaterialCommunityIcons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B7D7A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  iconWrap: {
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    marginTop: 2,
  },
});
