import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';

export function AppBar() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const logoSource = isDark
    ? require('../assets/images/logo_dark.png')
    : require('../assets/images/logo_light.png');

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from GrowVidya Student?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleOpenChangePassword = () => {
    setMenuVisible(false);
    router.push('/change-password');
  };

  return (
    <View style={styles.appBarContainer}>
      {/* Left Logo */}
      <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />

      {/* Right Three Dot Menu Button */}
      <TouchableOpacity
        style={[styles.menuButton, { backgroundColor: colors.surfaceSubtle }]}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Three Dot Menu Modal Dropdown */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.overlay}>
            <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Option 1: Toggle Theme Switch */}
              <TouchableOpacity
                style={styles.themeMenuItem}
                onPress={() => {
                  toggleTheme();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
                  <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={() => {
                    toggleTheme();
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              {/* Option 2: Change Password */}
              <TouchableOpacity style={styles.menuItem} onPress={handleOpenChangePassword}>
                <Ionicons name="key-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  Change Password
                </Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              {/* Option 3: Logout */}
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appBarContainer: {
    height: Platform.OS === 'ios' ? 56 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoImage: {
    width: 140,
    height: 36,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 16,
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  themeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 8,
  },
});
