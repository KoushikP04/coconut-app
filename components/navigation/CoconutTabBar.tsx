/**
 * Bottom tabs matching `MobileAppPage.tsx` / Figma: two equal columns + centered FAB that overlaps the bar.
 */
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, darkUI, font, fontSize } from "../../lib/theme";
import { useState } from "react";
import { useTheme } from "../../lib/theme-context";

export function CoconutTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 22 : 10);
  const current = state.routes[state.index]?.name;
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const hiddenRoutes = new Set(["add-expense", "receipt", "pay", "review"]);

  const triggerMediumHaptic = () => {
    // Some iOS runtimes/simulators expose expo-haptics without native support.
    // Swallow errors so tap actions continue to work.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const goIndex = () => {
    navigation.navigate("index" as never);
  };
  const goActivity = () => {
    navigation.navigate("activity" as never);
  };
  const goAdd = () => {
    triggerMediumHaptic();
    router.push({
      pathname: "/(tabs)/add-expense",
      params: {
        prefillNonce: String(Date.now()),
        prefillDesc: "",
        prefillAmount: "",
      },
    });
  };
  const openAddMenu = () => {
    triggerMediumHaptic();
    setFabMenuOpen(true);
  };

  const homeActive = current === "index";
  const activityActive = current === "activity";

  if (current && hiddenRoutes.has(current)) {
    return null;
  }

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad, backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
      <View style={styles.row}>
          <Pressable
            onPress={goIndex}
            style={({ pressed }) => [styles.side, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: homeActive }}
            accessibilityLabel="Home"
          >
            <Ionicons
              name={homeActive ? "home" : "home-outline"}
              size={22}
              color={homeActive ? theme.tabActive : theme.tabInactive}
            />
            <Text style={[styles.label, { color: homeActive ? theme.tabActive : theme.tabInactive }]}>Home</Text>
          </Pressable>

          <Pressable
            onPress={goActivity}
            style={({ pressed }) => [styles.side, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: activityActive }}
            accessibilityLabel="Activity"
          >
            <Ionicons
              name={activityActive ? "time" : "time-outline"}
              size={22}
              color={activityActive ? theme.tabActive : theme.tabInactive}
            />
            <Text style={[styles.label, { color: activityActive ? theme.tabActive : theme.tabInactive }]}>Activity</Text>
          </Pressable>
        </View>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <View style={[styles.fabHalo, { backgroundColor: `${theme.primary}4D` }]} pointerEvents="none" />
        <Pressable
          onPress={() => {
            openAddMenu();
          }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.primary, borderColor: "rgba(255, 255, 255, 0.42)" },
            pressed && styles.fabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add options"
        >
          <View style={styles.fabGloss} pointerEvents="none" />
          <Ionicons name="add" size={32} color="#FFFFFF" style={styles.fabIcon} />
        </Pressable>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={fabMenuOpen}
        onRequestClose={() => setFabMenuOpen(false)}
      >
        <Pressable style={styles.fabOverlay} onPress={() => setFabMenuOpen(false)}>
          <Pressable style={styles.fabMenu} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.fabMenuTitle}>Add</Text>

            <TouchableOpacity
              style={styles.fabMenuRow}
              onPress={() => {
                setFabMenuOpen(false);
                goAdd();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fabMenuRowTitle}>Add expense</Text>
                <Text style={styles.fabMenuRowSub}>Split manually with people</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={darkUI.labelMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuRow}
              onPress={() => {
                setFabMenuOpen(false);
                triggerMediumHaptic();
                router.push("/(tabs)/receipt");
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fabMenuRowTitle}>Scan receipt</Text>
                <Text style={styles.fabMenuRowSub}>Parse items, then assign</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={darkUI.labelMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuCancel}
              onPress={() => setFabMenuOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.fabMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Slightly larger than before; sits higher so it reads as floating above the bar. */
const FAB = 64;
/** Soft brand glow behind the button (reads as “lift” on dark UI). */
const HALO = 16;
const FAB_TOP = -(FAB / 2) - 14;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: darkUI.bg,
    borderTopWidth: 1,
    borderTopColor: darkUI.stroke,
    paddingTop: 10,
    position: "relative",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  side: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: fontSize["2xs"],
    letterSpacing: 0.2,
    color: darkUI.labelSecondary,
  },
  labelActive: {
    color: colors.primary,
  },
  fabWrap: {
    position: "absolute",
    left: "50%",
    top: FAB_TOP - HALO / 2,
    width: FAB + HALO,
    height: FAB + HALO,
    marginLeft: -(FAB + HALO) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fabHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: (FAB + HALO) / 2,
    backgroundColor: "rgba(61, 142, 98, 0.25)",
    transform: [{ scale: 1.12 }],
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    /** Richer than flat primary: aligns with money-positive green, still on-brand. */
    backgroundColor: "#3FA56C",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.35)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.96,
  },
  /** Subtle top highlight — reads as a lit sphere, not a flat disk. */
  fabGloss: {
    position: "absolute",
    top: 0,
    left: "12%",
    right: "12%",
    height: "38%",
    borderTopLeftRadius: FAB / 2,
    borderTopRightRadius: FAB / 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  fabIcon: {
    marginTop: 1,
    /** Crisp + on the gradient fill */
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  fabMenu: {
    margin: 16,
    backgroundColor: darkUI.card,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    borderRadius: 20,
    padding: 16,
    paddingTop: 10,
  },
  fabMenuTitle: {
    fontFamily: font.bold,
    fontSize: 18,
    color: darkUI.label,
    marginBottom: 10,
  },
  fabMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkUI.strokeSoft,
    marginBottom: 10,
  },
  fabMenuRowTitle: {
    fontFamily: font.bold,
    fontSize: 15,
    color: darkUI.label,
  },
  fabMenuRowSub: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: 12,
    color: darkUI.labelMuted,
  },
  fabMenuCancel: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 6,
  },
  fabMenuCancelText: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: darkUI.labelSecondary,
  },
});
