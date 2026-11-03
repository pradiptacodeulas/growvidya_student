import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';

export interface InAppChatNotificationProps {
  senderName?: string;
  message?: string;
  avatarUrl?: string | null;
  senderRole?: string;
  time?: string;
  onPress?: () => void;
  onClose?: () => void;
}

export default function InAppChatNotification({
  senderName = 'New Message',
  message = '',
  avatarUrl,
  senderRole,
  time = 'Just now',
  onPress,
  onClose,
}: InAppChatNotificationProps) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Explicit card width adapted for phone screens
  const cardWidth = Math.min(windowWidth - 24, 460);

  // Role-based badge styling
  const normalizedRole = String(senderRole || '').toLowerCase();
  const getRoleBadge = () => {
    switch (normalizedRole) {
      case 'teacher':
      case 'faculty':
        return {
          label: 'Teacher',
          bg: isDark ? '#1E2545' : '#EEF2FF',
          color: colors.primary,
          icon: 'school-outline' as const,
        };
      case 'parent':
        return {
          label: 'Parent',
          bg: isDark ? '#143823' : '#E8F5E9',
          color: '#10B981',
          icon: 'people-outline' as const,
        };
      case 'admin':
      case 'super admin':
        return {
          label: 'Admin',
          bg: isDark ? '#3B1A40' : '#F3E8FF',
          color: '#9333EA',
          icon: 'shield-checkmark-outline' as const,
        };
      default:
        return {
          label: senderRole ? senderRole.charAt(0).toUpperCase() + senderRole.slice(1) : 'Faculty',
          bg: isDark ? '#1E2545' : '#EEF2FF',
          color: colors.primary,
          icon: 'chatbubble-ellipses-outline' as const,
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        styles.container,
        {
          width: cardWidth,
          backgroundColor: isDark ? '#181E2C' : '#FFFFFF',
          borderColor: isDark ? colors.border : '#E4E9F2',
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {/* Left: Avatar with fallback initials and green online dot */}
      <View style={styles.avatarWrapper}>
        <Avatar
          name={senderName}
          picture={avatarUrl}
          size={46}
        />
        <View
          style={[
            styles.onlineDot,
            { borderColor: isDark ? '#181E2C' : '#FFFFFF' },
          ]}
        />
      </View>

      {/* Center: Details & Message Preview */}
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[styles.senderName, { color: colors.textPrimary }]}
          >
            {senderName}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={11} color={badge.color} style={{ marginRight: 3 }} />
            <Text style={[styles.roleText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={[styles.messageText, { color: colors.textSecondary }]}
        >
          {message}
        </Text>

        <View style={styles.footerRow}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {time}
          </Text>
          <View style={styles.tapToReply}>
            <Text style={[styles.tapToReplyText, { color: colors.primary }]}>
              Reply
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Right: Dismiss Close Button */}
      {onClose && (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onClose}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          style={[
            styles.closeButton,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
          ]}
        >
          <Ionicons name="close" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tapToReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tapToReplyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
});
