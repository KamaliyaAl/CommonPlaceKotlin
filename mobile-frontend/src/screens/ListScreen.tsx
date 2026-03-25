import React from "react";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";

function ActionButton({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.button} onPress={onPress}>
      <Text style={s.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ListScreen() {
    const navigation = useNavigation<any>();
  return (
//     <ImageBackground
//       source={require("../../assets/background2.jpg")}
//       style={s.background}
//       resizeMode="cover"
//     >
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <View style={s.row}>
          <TouchableOpacity style={s.button} onPress={() => navigation.navigate("Find")}>
                    <Text style={s.buttonText}>Find</Text>
          </TouchableOpacity>
            <View style={s.spacer} />
            <ActionButton title="My Events" />
          </View>

          <View style={s.rowMarginTop} />

          <View style={s.row}>
           <TouchableOpacity style={s.button} onPress={() => navigation.navigate("Favourites")}>
                              <Text style={s.buttonText}>Favourites</Text>
           </TouchableOpacity>
            <View style={s.spacer} />
            <ActionButton title="History" />
          </View>
        </View>
      </SafeAreaView>
//     </ImageBackground>
  );
}

const s = StyleSheet.create({
//     background: { flex: 1 }, // ✅ иначе фон не виден
  safe: {
      flex: 1,
      backgroundColor: "#fff",
    },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },

  spacer: { width: 20 }, // ✅ вместо gap

  rowMarginTop: { height: 20 }, // ✅ вместо gap по вертикали

  button: {
    flex: 1,
    height: 120,
    backgroundColor: "rgba(255,255,255, 0.85)", // читабельнее на фоне
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },
});