import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/context/AuthContext';

function NativeTabLayout() {
  const { user } = useAuth();
  const isDirector = user?.role === 'director';

  return (
    <NativeTabs>
      {isDirector && (
        <NativeTabs.Trigger name="director">
          <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
          <Label>Director</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="buffet">
        <Icon sf={{ default: 'thermometer', selected: 'thermometer' }} />
        <Label>Buffet</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="thawing">
        <Icon sf={{ default: 'snowflake', selected: 'snowflake' }} />
        <Label>Thawing</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="received">
        <Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} />
        <Label>Receiving</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="disinfection">
        <Icon sf={{ default: 'drop', selected: 'drop.fill' }} />
        <Label>Sanitation</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const { user } = useAuth();
  const isDirector = user?.role === 'director';

  return (
    <Tabs
      initialRouteName={isDirector ? 'director' : 'index'}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
          paddingBottom: isWeb ? 34 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      {/* Director-only tab */}
      <Tabs.Screen
        name="director"
        options={{
          title: 'Director',
          tabBarButton: isDirector ? undefined : () => null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.bar.fill" tintColor={color} size={22} /> : <Feather name="bar-chart-2" size={22} color={color} />,
          tabBarActiveTintColor: '#6D28D9',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={22} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buffet"
        options={{
          title: 'Buffet',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="thermometer" tintColor={color} size={22} /> : <Feather name="thermometer" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="thawing"
        options={{
          title: 'Thawing',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="snowflake" tintColor={color} size={22} /> : <Feather name="wind" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="received"
        options={{
          title: 'Receiving',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="shippingbox" tintColor={color} size={22} /> : <Feather name="package" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="disinfection"
        options={{
          title: 'Sanitation',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="drop" tintColor={color} size={22} /> : <Feather name="droplet" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
