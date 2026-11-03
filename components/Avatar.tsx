import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { getAvatarUrl, hasValidAvatar, getNameInitials } from "../services/apiClient";

export interface AvatarProps {
  name?: string | null;
  picture?: string | null;
  gender?: string | number | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  picture,
  gender,
  size = 50,
  style,
  textStyle,
  borderColor,
  borderWidth = 0,
  backgroundColor,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const isValid = hasValidAvatar(picture);
  const initials = getNameInitials(name);
  const avatarUri = isValid ? getAvatarUrl(picture, gender) : null;

  const resolvedBorderRadius = size / 2;
  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: resolvedBorderRadius,
      backgroundColor: backgroundColor || colors.primary,
      borderColor: borderColor || colors.border,
      borderWidth: borderWidth,
    },
    style,
  ];

  if (isValid && avatarUri && !imageError) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: avatarUri }}
          style={{
            width: size,
            height: size,
            borderRadius: resolvedBorderRadius,
          }}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      </View>
    );
  }

  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <View style={[containerStyle, styles.center]}>
      <Text
        style={[
          styles.initialsText,
          {
            fontSize,
            lineHeight: Math.round(fontSize * 1.2),
          },
          textStyle,
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});

export default Avatar;
