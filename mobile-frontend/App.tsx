import React from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import Tabs from "./src/navigation/Tabs";
import { AuthProvider } from "./src/auth/AuthContext";
import { EventsProvider } from "./src/context/EventsContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import NotificationBanner from "./src/components/NotificationBanner";

export default function App() {
  return (
    <AuthProvider>
      <EventsProvider>
        <NotificationProvider>
          <View style={styles.root}>
            <NavigationContainer>
              <Tabs />
            </NavigationContainer>
            {/* Global banner sits above everything */}
            <NotificationBanner />
          </View>
        </NotificationProvider>
      </EventsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});