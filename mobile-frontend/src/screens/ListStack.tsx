import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ListScreen from "../screens/ListScreen";
import FindScreen from "../screens/FindScreen";

export type ListStackParamList = {
  ListHome: undefined;
  Find: undefined;
};

const Stack = createNativeStackNavigator<ListStackParamList>();

export default function ListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListHome" component={ListScreen} />
      <Stack.Screen name="Find" component={FindScreen} />
    </Stack.Navigator>
  );
}