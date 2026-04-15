import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ListScreen from "../screens/ListScreen";
import FindScreen from "../screens/FindScreen";
import FavouritesScreen from "../screens/FavouritesScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReviewScreen from "../screens/ReviewScreen";

export type ListStackParamList = {
  ListHome: undefined;
  Find: undefined;
  Favourites: undefined;
  EventDetails: { eventId: string };
  UserProfile: { userId: string };
  Reviews: { eventId: string };
};

const Stack = createNativeStackNavigator<ListStackParamList>();

export default function ListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListHome" component={ListScreen} />
      <Stack.Screen name="Find" component={FindScreen} />
      <Stack.Screen name="Favourites" component={FavouritesScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="Reviews" component={ReviewScreen} />
    </Stack.Navigator>
  );
}