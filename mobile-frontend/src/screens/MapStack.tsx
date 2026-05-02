import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MapScreen from "../screens/MapScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import PlaceDetailsScreen from "../screens/PlaceDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReviewScreen from "../screens/ReviewScreen";
import PlaceReviewScreen from "../screens/PlaceReviewScreen";

export type MapStackParamList = {
  MapMain: { date?: string; eventId?: string; placeId?: string; latitude?: number; longitude?: number } | undefined;
  EventDetails: { eventId: string };
  PlaceDetails: { placeId: string };
  UserProfile: { userId: string };
  Reviews: { eventId: string };
  PlaceReviews: { placeId: string };
};

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="Reviews" component={ReviewScreen} />
      <Stack.Screen name="PlaceReviews" component={PlaceReviewScreen} />
    </Stack.Navigator>
  );
}
