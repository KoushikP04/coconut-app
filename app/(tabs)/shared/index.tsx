import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  AppState,
  DeviceEventEmitter,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useApiFetch } from "../../../lib/api";
import { useGroupsSummary } from "../../../hooks/useGroups";
import { useDemoMode } from "../../../lib/demo-mode-context";
import { SharedSkeletonScreen } from "../../../components/ui";
import { useDemoData } from "../../../lib/demo-context";
import { colors, font, radii, darkUI, prototype } from "../../../lib/theme";

const AVATAR_COLORS = ["#3D8E62", "#4A6CF7", "#E8507A", "#F59E0B", "#10A37F", "#8B5CF6"] as const;

function SLabel({ children }: { children: ReactNode }) {
  return <Text style={st.sLabel}>{children}</Text>;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hue = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${hue}33`,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: `${hue}55`,
      }}
    >
      <Text style={{ color: hue, fontFamily: font.bold, fontSize: size * 0.32 }}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SharedIndex() {
  const apiFetch = useApiFetch();
  const isFocused = useIsFocused();
  const { isDemoOn, setIsDemoOn } = useDemoMode();
  const demo = useDemoData();
  const { summary: realSummary, loading, refetch } = useGroupsSummary();
  const summary = isDemoOn ? demo.summary : realSummary;

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const prevFocused = useRef(false);
  const prevDemoOn = useRef(isDemoOn);

  const onRefresh = useCallback(async () => {
    if (isDemoOn) return;
    setRefreshing(true);
    try {
      await refetch(true);
    } finally {
      setRefreshing(false);
    }
  }, [isDemoOn, refetch]);

  useEffect(() => {
    if (isFocused && !prevFocused.current && !isDemoOn) refetch(true);
    prevFocused.current = isFocused;
  }, [isFocused, isDemoOn, refetch]);

  useEffect(() => {
    if (isDemoOn) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refetch(true);
    });
    return () => sub.remove();
  }, [isDemoOn, refetch]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("expense-added", () => {
      if (!isDemoOn) refetch(true);
    });
    return () => sub.remove();
  }, [isDemoOn, refetch]);

  useEffect(() => {
    if (prevDemoOn.current && !isDemoOn) refetch(true);
    prevDemoOn.current = isDemoOn;
  }, [isDemoOn, refetch]);

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) return;
    if (isDemoOn) {
      Alert.alert("Demo", `"${name}" created`);
      setGroupName("");
      setShowCreate(false);
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch("/api/groups", {
        method: "POST",
        body: { name, ownerDisplayName: "You" } as object,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        Alert.alert("Error", data?.error ?? "Could not create group");
        return;
      }
      setShowCreate(false);
      setGroupName("");
      await refetch(true);
      router.push({ pathname: "/(tabs)/shared/group", params: { id: data.id } });
    } finally {
      setCreating(false);
    }
  };

  const addFriend = async () => {
    const name = friendName.trim();
    const email = friendEmail.trim() || null;
    if (!name) return;

    if (isDemoOn) {
      Alert.alert("Demo", `Added ${name}`);
      setFriendName("");
      setFriendEmail("");
      setShowAddFriend(false);
      return;
    }

    setAddingFriend(true);
    try {
      const groupRes = await apiFetch("/api/groups", {
        method: "POST",
        body: { name, ownerDisplayName: "You" } as object,
      });
      const group = await groupRes.json().catch(() => null);
      if (!groupRes.ok || !group?.id) {
        Alert.alert("Error", group?.error ?? "Failed to add friend");
        return;
      }

      const memberRes = await apiFetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        body: { displayName: name, ...(email ? { email } : {}) } as object,
      });
      const memberData = await memberRes.json().catch(() => null);
      if (!memberRes.ok) {
        void apiFetch(`/api/groups/${group.id}`, { method: "DELETE" });
        Alert.alert("Error", memberData?.error ?? "Failed to add friend");
        return;
      }

      setShowAddFriend(false);
      setFriendName("");
      setFriendEmail("");
      await refetch(true);
    } catch {
      Alert.alert("Error", "Network error. Try again.");
    } finally {
      setAddingFriend(false);
    }
  };

  if (loading && !summary) return <SharedSkeletonScreen />;

  const friends = summary?.friends ?? [];
  const groups = summary?.groups ?? [];

  return (
    <SafeAreaView style={st.container} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.page}
        showsVerticalScrollIndicator={false}
        refreshControl={!isDemoOn ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        <View style={st.header}>
          <View>
            <Text style={st.title}>People & groups</Text>
            <Text style={st.titleSub}>Manage everyone you split with</Text>
          </View>
          {__DEV__ ? (
            <View style={st.demoToggle}>
              <Text style={st.demoLabel}>Demo</Text>
              <Switch
                value={isDemoOn}
                onValueChange={setIsDemoOn}
                trackColor={{ false: "#E5E7EB", true: "#C3E0D3" }}
                thumbColor={isDemoOn ? "#3D8E62" : "#F9FAFB"}
              />
            </View>
          ) : null}
        </View>

        <View style={st.actionsRow}>
          <TouchableOpacity
            style={st.actionBtn}
            onPress={() => {
              setShowAddFriend((v) => !v);
              setShowCreate(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={st.actionBtnText}>Add friend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.actionBtnAlt}
            onPress={() => {
              setShowCreate((v) => !v);
              setShowAddFriend(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={16} color={colors.primary} />
            <Text style={st.actionBtnAltText}>New group</Text>
          </TouchableOpacity>
        </View>

        {showAddFriend ? (
          <View style={st.formCard}>
            <TextInput
              style={st.formInput}
              value={friendName}
              onChangeText={setFriendName}
              placeholder="Friend name"
              placeholderTextColor={darkUI.labelMuted}
              autoFocus
            />
            <TextInput
              style={[st.formInput, { marginTop: 8 }]}
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="Email (optional)"
              placeholderTextColor={darkUI.labelMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={st.formActions}>
              <TouchableOpacity style={st.formPrimaryBtn} onPress={addFriend} disabled={!friendName.trim() || addingFriend}>
                <Text style={st.formPrimaryBtnText}>{addingFriend ? "Adding…" : "Add"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddFriend(false); setFriendName(""); setFriendEmail(""); }}>
                <Text style={st.formCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {showCreate ? (
          <View style={st.formCard}>
            <TextInput
              style={st.formInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={darkUI.labelMuted}
              autoFocus
            />
            <View style={st.formActions}>
              <TouchableOpacity style={st.formPrimaryBtn} onPress={createGroup} disabled={!groupName.trim() || creating}>
                <Text style={st.formPrimaryBtnText}>{creating ? "Creating…" : "Create"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreate(false); setGroupName(""); }}>
                <Text style={st.formCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <SLabel>Friends</SLabel>
        {!friends.length ? (
          <View style={[st.groupedCard, st.emptyInner]}>
            <Ionicons name="person-add-outline" size={30} color={darkUI.labelMuted} />
            <Text style={st.emptyTitle}>No friends yet</Text>
            <Text style={st.emptySub}>Add a friend to start splitting expenses.</Text>
          </View>
        ) : (
          <View style={st.groupedCard}>
            {friends.map((f, i) => (
              <View key={f.key}>
                <TouchableOpacity
                  style={st.groupedRow}
                  onPress={() => router.push({ pathname: "/(tabs)/shared/person", params: { key: f.key } })}
                  activeOpacity={0.75}
                >
                  <Avatar name={f.displayName} size={42} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.rowName}>{f.displayName}</Text>
                    <Text style={st.rowSub}>
                      {f.balance === 0 ? "settled up" : f.balance > 0 ? "owes you" : "you owe"}
                    </Text>
                  </View>
                  <Text style={[st.rowBal, f.balance > 0 ? st.balIn : f.balance < 0 ? st.balOut : st.muted]}>
                    {f.balance === 0 ? "—" : `${f.balance > 0 ? "+" : "−"}$${Math.abs(f.balance).toFixed(2)}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={darkUI.labelMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
                </TouchableOpacity>
                {i < friends.length - 1 ? <View style={st.rowSep} /> : null}
              </View>
            ))}
          </View>
        )}

        <SLabel>Groups</SLabel>
        {!groups.length ? (
          <View style={[st.groupedCard, st.emptyInner]}>
            <Ionicons name="people-outline" size={30} color={darkUI.labelMuted} />
            <Text style={st.emptyTitle}>No groups yet</Text>
            <Text style={st.emptySub}>Create a group for trips, roommates, or dinners.</Text>
          </View>
        ) : (
          <View style={st.groupedCard}>
            {groups.map((g, i) => (
              <View key={g.id}>
                <TouchableOpacity
                  style={st.groupedRow}
                  onPress={() => router.push({ pathname: "/(tabs)/shared/group", params: { id: g.id } })}
                  activeOpacity={0.75}
                >
                  <View style={st.groupIcon}>
                    <Ionicons name="people" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.rowName}>{g.name}</Text>
                    <Text style={st.rowSub}>{g.memberCount} members · {timeAgo(g.lastActivityAt)}</Text>
                  </View>
                  <Text style={[st.rowBal, g.myBalance > 0 ? st.balIn : g.myBalance < 0 ? st.balOut : st.muted]}>
                    {g.myBalance === 0 ? "—" : `${g.myBalance > 0 ? "+" : "−"}$${Math.abs(g.myBalance).toFixed(2)}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={darkUI.labelMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
                </TouchableOpacity>
                {i < groups.length - 1 ? <View style={st.rowSep} /> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkUI.bg },
  page: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 26, fontFamily: font.black, color: darkUI.label, letterSpacing: -0.6 },
  titleSub: { fontSize: 13, fontFamily: font.medium, color: darkUI.labelMuted, marginTop: 2 },
  demoToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoLabel: { fontSize: 12, fontFamily: font.semibold, color: darkUI.labelSecondary },

  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#fff", fontFamily: font.bold, fontSize: 13 },
  actionBtnAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}20`,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnAltText: { color: colors.primary, fontFamily: font.bold, fontSize: 13 },

  formCard: {
    backgroundColor: darkUI.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    padding: 14,
    marginBottom: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: darkUI.stroke,
    backgroundColor: darkUI.bg,
    borderRadius: 10,
    color: darkUI.label,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 15,
  },
  formActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  formPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  formPrimaryBtnText: { color: "#fff", fontFamily: font.bold, fontSize: 14 },
  formCancelText: { color: darkUI.labelSecondary, fontFamily: font.semibold, fontSize: 14 },

  sLabel: {
    fontSize: 11,
    fontFamily: font.extrabold,
    color: darkUI.labelMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  groupedCard: {
    backgroundColor: darkUI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    overflow: "hidden",
    marginBottom: 8,
  },
  groupedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowName: { fontSize: 16, fontFamily: font.semibold, color: darkUI.label },
  rowSub: { fontSize: 12, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 1 },
  rowBal: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.3 },
  balIn: { color: prototype.green },
  balOut: { color: prototype.red },
  muted: { color: darkUI.labelMuted },
  rowSep: { height: 1, backgroundColor: prototype.sep, marginLeft: 70 },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(61,142,98,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInner: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontFamily: font.bold, color: darkUI.labelSecondary, marginTop: 10 },
  emptySub: { fontSize: 13, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 4, textAlign: "center" },
});

