import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MapScreen from "../screens/MapScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import PlaceDetailsScreen from "../screens/PlaceDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type MapStackParamList = {
  MapMain: { date?: string } | undefined;
  EventDetails: { eventId: string };
  PlaceDetails: { placeId: string };
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
