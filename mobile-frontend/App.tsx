import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Tabs from "./src/navigation/Tabs";
import { AuthProvider } from "./src/auth/AuthContext";
import { EventsProvider } from "./src/context/EventsContext";

export default function App() {
  return (
    <AuthProvider>
      <EventsProvider>
        <NavigationContainer>
          <Tabs />
        </NavigationContainer>
      </EventsProvider>
    </AuthProvider>
  );
}