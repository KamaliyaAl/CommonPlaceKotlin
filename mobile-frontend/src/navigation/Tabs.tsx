import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AddScreen from "../screens/AddScreen";
import ListStack from "../screens/ListStack";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import UsersListScreen from "../screens/UsersListScreen";

export type BottomTabParamList = {
    Add: undefined;
    List: undefined;
    Map: { date?: string } | undefined;
    Users: undefined;
    Chat: undefined;
    Profile: { userId?: string } | undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function Tabs() {
    return (
        <Tab.Navigator
            initialRouteName="Map"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,

                tabBarStyle: {
                    height: Platform.OS === "ios" ? 84 : 64,
                    paddingBottom: Platform.OS === "ios" ? 22 : 10,
                    paddingTop: 10,
                    backgroundColor: "#D9D9D9",
                    borderTopWidth: 0,
                },

                tabBarActiveTintColor: "#7FA6FF",
                tabBarInactiveTintColor: "#5A5A5A",

                tabBarIcon: ({ color, size }) => {
                    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = "help";

                    switch (route.name) {
                        case "Add":
                            iconName = "square-edit-outline";
                            break;
                        case "List":
                            iconName = "view-list-outline";
                            break;
                        case "Map":
                            iconName = "map-marker-radius-outline";
                            break;
                        case "Users":
                            iconName = "account-group-outline";
                            break;
                        case "Chat":
                            iconName = "message-outline";
                            break;
                        case "Profile":
                            iconName = "account-outline";
                            break;
                    }

                    const finalSize = route.name === "Map" ? size + 6 : size;

                    return (
                        <MaterialCommunityIcons
                            name={iconName}
                            size={finalSize}
                            color={color}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Add" component={AddScreen} />
            <Tab.Screen name="List" component={ListStack} />
            <Tab.Screen name="Map" component={MapScreen} />
            <Tab.Screen name="Users" component={UsersListScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
