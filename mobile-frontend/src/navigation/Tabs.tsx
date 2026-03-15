import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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
    UsersTab: undefined;
    Chat: undefined;
    ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();
const UsersStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function UsersNavigator() {
    return (
        <UsersStack.Navigator screenOptions={{ headerShown: false }}>
            <UsersStack.Screen name="UsersList" component={UsersListScreen} />
            <UsersStack.Screen name="UserProfile" component={ProfileScreen} />
        </UsersStack.Navigator>
    );
}

function ProfileNavigator() {
    return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen name="MyProfile" component={ProfileScreen} />
        </ProfileStack.Navigator>
    );
}

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
                        case "UsersTab":
                            iconName = "account-group-outline";
                            break;
                        case "Chat":
                            iconName = "message-outline";
                            break;
                        case "ProfileTab":
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
            <Tab.Screen name="UsersTab" component={UsersNavigator} />
            <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
        </Tab.Navigator>
    );
}
