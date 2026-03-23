/**
 * Home tab — UI matches `Create design prototype (1)/src/app/pages/MobileAppPage.tsx` HomeScreen.
 * No legacy transaction list / NL search / insights on this screen.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { useGroupsSummary } from "../../hooks/useGroups";
import { useTransactions } from "../../hooks/useTransactions";
import { useDemoMode } from "../../lib/demo-mode-context";
import { useDemoData } from "../../lib/demo-context";
import { useTheme } from "../../lib/theme-context";
import { THEME_VARIANTS } from "../../lib/colors";
import { BalanceHero } from "../../components/split/BalanceHero";
import { colors, font, radii, shadow, darkUI, prototype } from "../../lib/theme";
import { MerchantLogo } from "../../components/merchant/MerchantLogo";
import { PROTOTYPE_DEMO_BANK_CHARGES } from "../../lib/prototype-bank-demo";
import { DEMO_HOME_DISPLAY_NAME, formatHomeGreetingLine } from "../../lib/home-greeting";
import {
  buildLiveMatchedStrip,
  demoChargeToStripRow,
  type HomeBankStripRow,
} from "../../lib/home-bank-strip";

const WEB_APP_URL = (process.env.EXPO_PUBLIC_API_URL || "https://coconut-app.dev").replace(/\/$/, "");

const FRIEND_HUES = ["#3D8E62", "#4A6CF7", "#E8507A", "#F59E0B", "#10A37F", "#8B5CF6"] as const;

function FriendAvatar({ name, size = 42 }: { name: string; size?: number }) {
  const hue = FRIEND_HUES[name.charCodeAt(0) % FRIEND_HUES.length];
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
      <Text style={{ color: hue, fontFamily: font.bold, fontSize: size * 0.3 }}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[styles.sLabel, { color: theme.textQuaternary }]}>{children}</Text>;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BalancesPrototypeScreen() {
  const { variant, setVariant, setMode, theme } = useTheme();
  const { isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const { isDemoOn } = useDemoMode();
  const demo = useDemoData();
  const { summary: apiSummary, refetch } = useGroupsSummary();

  const summary = isDemoOn ? demo.summary : apiSummary;
  const [dismissedBank, setDismissedBank] = useState<string[]>([]);
  const [selectedStrip, setSelectedStrip] = useState<HomeBankStripRow | null>(null);
  const [showAllBank, setShowAllBank] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const useDemoBankUi = isDemoOn || !isSignedIn;
  const { transactions, linked, loading: txLoading, status: txStatus, refetch: refetchTx } = useTransactions();

  const demoStripRows = useMemo(() => {
    if (!useDemoBankUi) return [];
    return PROTOTYPE_DEMO_BANK_CHARGES.filter(
      (tx) => tx.unsplit && !dismissedBank.includes(tx.id)
    ).map(demoChargeToStripRow);
  }, [useDemoBankUi, dismissedBank]);

  const liveStripRows = useMemo(() => {
    if (useDemoBankUi) return [];
    const built = buildLiveMatchedStrip(transactions);
    return built.filter((r) => !dismissedBank.includes(r.stripId));
  }, [useDemoBankUi, transactions, dismissedBank]);

  const stripRows = useDemoBankUi ? demoStripRows : liveStripRows;
  const previewStripRows = useMemo(
    () => PROTOTYPE_DEMO_BANK_CHARGES.slice(0, 3).map(demoChargeToStripRow),
    []
  );
  const allLinkedBankRows = useMemo(() => {
    if (!linked) return [];
    return transactions
      .filter((tx) => Number(tx.amount) < 0)
      .sort((a, b) => {
        const da = new Date(a.dateStr || a.date || "").getTime();
        const db = new Date(b.dateStr || b.date || "").getTime();
        return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
      })
      .slice(0, 120);
  }, [transactions, linked]);

  const openBankOnWeb = useCallback(() => {
    void Linking.openURL(`${WEB_APP_URL}/app/transactions`);
  }, []);

  const onRefresh = useCallback(async () => {
    if (isDemoOn) return;
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchTx()]);
    } finally {
      setRefreshing(false);
    }
  }, [isDemoOn, refetch, refetchTx]);

  const friends = summary?.friends ?? [];
  const groups = summary?.groups ?? [];
  const hasFriendsOrGroups = friends.length > 0 || groups.length > 0;
  const showPreviewForEmptyRealState = !isDemoOn && isSignedIn && !hasFriendsOrGroups;
  const previewFriends = (demo.summary?.friends ?? []).slice(0, 2);
  const previewGroups = (demo.summary?.groups ?? []).slice(0, 2);

  const friendExpenseCount = (key: string) =>
    isDemoOn ? (demo.personDetails[key]?.activity.length ?? 0) : undefined;

  const greetingName = isDemoOn
    ? DEMO_HOME_DISPLAY_NAME
    : userLoaded && isSignedIn
      ? (user?.firstName?.trim() || user?.username?.trim() || "")
      : "";
  const greetingTitle = formatHomeGreetingLine(greetingName);
  const activeVariantLabel = THEME_VARIANTS.find((v) => v.key === variant)?.label ?? "Theme";
  const cycleThemeVariant = useCallback(() => {
    const idx = THEME_VARIANTS.findIndex((v) => v.key === variant);
    const next = THEME_VARIANTS[(idx + 1) % THEME_VARIANTS.length];
    setMode("dark");
    setVariant(next.key);
  }, [variant, setVariant, setMode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isDemoOn ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          )
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {greetingTitle}
            </Text>
            <Text style={[styles.titleSub, { color: theme.textQuaternary }]}>Here&apos;s where you stand with friends and groups.</Text>
          </View>
          <TouchableOpacity style={[styles.themeFlag, { backgroundColor: theme.primary }]} onPress={cycleThemeVariant} activeOpacity={0.82}>
            <Ionicons name="color-palette-outline" size={14} color="#fff" />
            <Text style={styles.themeFlagText}>{activeVariantLabel}</Text>
          </TouchableOpacity>
        </View>

        <BalanceHero summary={summary} />

        {useDemoBankUi && stripRows.length > 0 ? (
          <View style={{ marginBottom: 18 }}>
            <View style={styles.sectionRow}>
              <SLabel>From your bank</SLabel>
              <TouchableOpacity onPress={() => setShowAllBank(true)} hitSlop={8}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={stripRows}
              keyExtractor={(t) => t.stripId}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.bankCard, item.cardDetailIsReceipt && styles.bankCardEmail]}
                  onPress={() => setSelectedStrip(item)}
                >
                  <View style={styles.bankTop}>
                    <View style={styles.bankEmojiWrap}>
                      <MerchantLogo
                        merchantName={item.merchant}
                        size={22}
                        fallbackText={item.emoji}
                        backgroundColor="transparent"
                        borderColor="transparent"
                      />
                      {item.hasMailBadge ? (
                        <View style={styles.mailDot}>
                          <Ionicons name="mail" size={7} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => setDismissedBank((d) => [...d, item.stripId])}
                      hitSlop={8}
                      style={{ padding: 2 }}
                    >
                      <Ionicons name="close" size={13} color={darkUI.labelMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.bankMerchant} numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text
                    style={item.cardDetailIsReceipt ? styles.bankEmailLine : styles.bankHint}
                    numberOfLines={1}
                  >
                    {item.cardDetailLine}
                  </Text>
                  <Text style={styles.bankAmt}>${item.amount.toFixed(2)}</Text>
                  <View style={styles.bankCta}>
                    <Text style={styles.bankCtaText}>
                      {item.cardDetailIsReceipt ? "Tap for details" : "Split this"}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : !useDemoBankUi ? (
          <View style={{ marginBottom: 18 }}>
            <View style={styles.sectionRow}>
              <SLabel>From your bank</SLabel>
              {linked ? (
                <TouchableOpacity onPress={() => setShowAllBank(true)} hitSlop={8}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {txStatus === "unauthorized" ? (
              <View style={styles.emptyBank}>
                <Text style={styles.emptyBankText}>Sign in again to load bank charges.</Text>
              </View>
            ) : !linked ? (
              <View style={styles.emptyBank}>
                <Text style={styles.emptyBankText}>
                  Connect your bank on the web to see charges. When a purchase matches an email receipt,
                  it&apos;ll show here to split.
                </Text>
              </View>
            ) : stripRows.length > 0 ? (
              <FlatList
                horizontal
                data={stripRows}
                keyExtractor={(t) => t.stripId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.bankCard, item.cardDetailIsReceipt && styles.bankCardEmail]}
                    onPress={() => setSelectedStrip(item)}
                  >
                    <View style={styles.bankTop}>
                      <View style={styles.bankEmojiWrap}>
                        <MerchantLogo
                          merchantName={item.merchant}
                          size={22}
                          fallbackText={item.emoji}
                          backgroundColor="transparent"
                          borderColor="transparent"
                        />
                        {item.hasMailBadge ? (
                          <View style={styles.mailDot}>
                            <Ionicons name="mail" size={7} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => setDismissedBank((d) => [...d, item.stripId])}
                        hitSlop={8}
                        style={{ padding: 2 }}
                      >
                        <Ionicons name="close" size={13} color={darkUI.labelMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.bankMerchant} numberOfLines={1}>
                      {item.merchant}
                    </Text>
                    <Text
                      style={item.cardDetailIsReceipt ? styles.bankEmailLine : styles.bankHint}
                      numberOfLines={1}
                    >
                      {item.cardDetailLine}
                    </Text>
                    <Text style={styles.bankAmt}>${item.amount.toFixed(2)}</Text>
                    <View style={styles.bankCta}>
                      <Text style={styles.bankCtaText}>
                        {item.cardDetailIsReceipt ? "Tap for details" : "Split this"}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            ) : txLoading ? (
              <View style={[styles.emptyBank, styles.emptyBankLoading]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.emptyBankText, { marginTop: 10 }]}>Loading bank charges…</Text>
              </View>
            ) : (
              <View>
                <View style={styles.previewPill}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                  <Text style={styles.previewPillText}>Preview</Text>
                </View>
                <FlatList
                  horizontal
                  data={previewStripRows}
                  keyExtractor={(t) => `preview-${t.stripId}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 8 }}
                  renderItem={({ item }) => (
                    <View style={[styles.bankCard, styles.previewCardDim]}>
                      <View style={styles.bankTop}>
                        <View style={styles.bankEmojiWrap}>
                          <MerchantLogo
                            merchantName={item.merchant}
                            size={22}
                            fallbackText={item.emoji}
                            backgroundColor="transparent"
                            borderColor="transparent"
                          />
                        </View>
                      </View>
                      <Text style={styles.bankMerchant} numberOfLines={1}>
                        {item.merchant}
                      </Text>
                      <Text style={item.cardDetailIsReceipt ? styles.bankEmailLine : styles.bankHint} numberOfLines={1}>
                        {item.cardDetailLine}
                      </Text>
                      <Text style={styles.bankAmt}>${item.amount.toFixed(2)}</Text>
                      <View style={styles.bankCta}>
                        <Text style={styles.bankCtaText}>
                          {item.cardDetailIsReceipt ? "Tap for details" : "Split this"}
                        </Text>
                      </View>
                    </View>
                  )}
                />
                <Text style={[styles.emptyBankText, { marginTop: 10 }]}>
                  No matched charges yet. This is how linked charges will appear once receipt matches start coming in.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ marginBottom: 12 }}>
          <View style={styles.sectionRow}>
            <SLabel>Friends & groups</SLabel>
            <TouchableOpacity onPress={() => router.push("/(tabs)/shared")} hitSlop={8}>
              <Text style={styles.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {!hasFriendsOrGroups ? (
            showPreviewForEmptyRealState ? (
              <View>
                <View style={styles.previewPill}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                  <Text style={styles.previewPillText}>Preview</Text>
                </View>
                <View style={[styles.groupedCard, styles.previewCardDim]}>
                  {previewFriends.map((f, i) => (
                    <View key={`pf-${f.key}`}>
                      <View style={styles.friendRow}>
                        <FriendAvatar name={f.displayName} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.friendName}>{f.displayName}</Text>
                          <Text style={styles.friendMeta}>
                            {f.balance >= 0 ? "owes you" : "you owe"} · preview
                          </Text>
                        </View>
                        <Text style={[styles.friendAmt, f.balance >= 0 ? styles.balAmtIn : styles.balAmtOut]}>
                          {f.balance >= 0 ? "+" : "−"}${Math.abs(f.balance).toFixed(2)}
                        </Text>
                      </View>
                      {i < previewFriends.length - 1 ? <View style={styles.rowSep} /> : null}
                    </View>
                  ))}
                  <View style={styles.sectionDivider} />
                  <View style={styles.inlineSectionLabel}>
                    <Text style={styles.inlineSectionLabelText}>Groups</Text>
                  </View>
                  {previewGroups.map((g, i) => (
                    <View key={`pg-${g.id}`}>
                      <View style={styles.groupRow}>
                        <View style={styles.groupIcon}>
                          <Ionicons name="people" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.groupRowName}>{g.name}</Text>
                          <Text style={styles.groupRowSub}>{g.memberCount} members · preview</Text>
                        </View>
                        <Text style={[styles.groupRowBal, g.myBalance >= 0 ? styles.balAmtIn : styles.balAmtOut]}>
                          {g.myBalance >= 0 ? "+" : "−"}${Math.abs(g.myBalance).toFixed(2)}
                        </Text>
                      </View>
                      {i < previewGroups.length - 1 ? <View style={styles.rowSep} /> : null}
                    </View>
                  ))}
                </View>
                <Text style={[styles.emptyFriendSub, { marginTop: 10 }]}>
                  Add your first friend/group in View all and this section will fill with your real balances.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyFriend}>
                <Ionicons name="people-outline" size={28} color={darkUI.labelMuted} />
                <Text style={styles.emptyFriendTitle}>No friends or groups yet</Text>
                <Text style={styles.emptyFriendSub}>Open View all to add people and groups.</Text>
              </View>
            )
          ) : (
            <View style={styles.groupedCard}>
              {friends.map((f, i) => {
                const nExp = friendExpenseCount(f.key);
                const pos = f.balance > 0;
                const neg = f.balance < 0;
                return (
                  <View key={f.key}>
                    <TouchableOpacity
                      style={styles.friendRow}
                      onPress={() => router.push({ pathname: "/(tabs)/shared/person", params: { key: f.key } })}
                      activeOpacity={0.75}
                    >
                      <FriendAvatar name={f.displayName} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.friendName}>{f.displayName}</Text>
                        <Text style={styles.friendMeta}>
                          {f.balance === 0
                            ? "settled up"
                            : pos
                              ? `owes you${nExp != null ? ` · ${nExp} expense${nExp !== 1 ? "s" : ""}` : ""}`
                              : `you owe${nExp != null ? ` · ${nExp} expense${nExp !== 1 ? "s" : ""}` : ""}`}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.friendAmt,
                          pos && { color: prototype.green },
                          neg && { color: prototype.red },
                          f.balance === 0 && { color: darkUI.labelMuted },
                        ]}
                      >
                        {f.balance === 0 ? "—" : `${pos ? "+" : "−"}$${Math.abs(f.balance).toFixed(2)}`}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={darkUI.labelMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
                    </TouchableOpacity>
                    {i < friends.length - 1 ? <View style={styles.rowSep} /> : null}
                  </View>
                );
              })}
              {friends.length > 0 && groups.length > 0 ? <View style={styles.sectionDivider} /> : null}
              {groups.length > 0 ? (
                <>
                  <View
                    style={[
                      styles.inlineSectionLabel,
                      friends.length > 0 ? styles.inlineSectionLabelAfterFriends : styles.inlineSectionLabelFirst,
                    ]}
                  >
                    <Text style={styles.inlineSectionLabelText}>Groups</Text>
                  </View>
                  {groups.map((g, i) => (
                    <View key={g.id}>
                      {i > 0 ? <View style={styles.rowSep} /> : null}
                      <TouchableOpacity
                        style={styles.groupRow}
                        onPress={() => router.push({ pathname: "/(tabs)/shared/group", params: { id: g.id } })}
                        activeOpacity={0.75}
                      >
                        <View style={styles.groupIcon}>
                          <Ionicons name="people" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.groupRowName}>{g.name}</Text>
                          <Text style={styles.groupRowSub}>
                            {g.memberCount} members · {timeAgo(g.lastActivityAt)}
                          </Text>
                        </View>
                        {g.myBalance !== 0 ? (
                          <Text
                            style={[
                              styles.groupRowBal,
                              g.myBalance > 0 ? styles.balAmtIn : styles.balAmtOut,
                            ]}
                          >
                            {g.myBalance > 0 ? "+" : "−"}${Math.abs(g.myBalance).toFixed(2)}
                          </Text>
                        ) : (
                          <Text style={[styles.groupRowBal, styles.balMuted]}>—</Text>
                        )}
                        <Ionicons name="chevron-forward" size={14} color={darkUI.labelMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedStrip} transparent animationType="slide" onRequestClose={() => setSelectedStrip(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedStrip(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {selectedStrip ? (
              <>
                <View style={styles.sheetHead}>
                  <View style={styles.sheetEmoji}>
                    <MerchantLogo
                      merchantName={selectedStrip.merchant}
                      size={32}
                      fallbackText={selectedStrip.emoji}
                      backgroundColor="transparent"
                      borderColor="transparent"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetMerchant}>{selectedStrip.merchant}</Text>
                    <Text style={styles.sheetDate}>{selectedStrip.sheetDateLine}</Text>
                  </View>
                  <Text style={styles.sheetAmt}>${selectedStrip.amount.toFixed(2)}</Text>
                </View>
                {selectedStrip.showReceiptBox && selectedStrip.receiptBoxText ? (
                  <View style={styles.emailBox}>
                    <View style={styles.emailRow}>
                      <Ionicons name="mail-outline" size={12} color={prototype.blue} />
                      <Text style={styles.emailLbl}>Matched from email receipt</Text>
                    </View>
                    <Text style={styles.emailSnippet}>{selectedStrip.receiptBoxText}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.splitBtn}
                  onPress={() => {
                    const row = selectedStrip;
                    setSelectedStrip(null);
                    router.push({
                      pathname: "/(tabs)/add-expense",
                      params: {
                        prefillDesc: row.merchant,
                        prefillAmount: row.amount.toFixed(2),
                        prefillNonce: String(Date.now()),
                      },
                    });
                  }}
                >
                  <Ionicons name="git-branch-outline" size={18} color="#fff" />
                  <Text style={styles.splitBtnText}>Split this charge</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetClose} onPress={() => setSelectedStrip(null)}>
                  <Text style={styles.sheetCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showAllBank} transparent animationType="slide" onRequestClose={() => setShowAllBank(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAllBank(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.allBankHead}>
              <Text style={styles.sheetMerchant}>All bank charges</Text>
              <TouchableOpacity onPress={() => setShowAllBank(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={darkUI.labelMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {allLinkedBankRows.length === 0 ? (
                <View style={styles.emptyBank}>
                  <Text style={styles.emptyBankText}>No linked card charges found.</Text>
                </View>
              ) : (
                <View style={styles.groupedCard}>
                  {allLinkedBankRows.map((tx, i) => (
                    <View key={tx.id}>
                      <TouchableOpacity
                        style={styles.friendRow}
                        activeOpacity={0.75}
                        onPress={() => {
                          setShowAllBank(false);
                          router.push({
                            pathname: "/(tabs)/add-expense",
                            params: {
                              prefillDesc: tx.merchant || tx.rawDescription || "Purchase",
                              prefillAmount: Math.abs(Number(tx.amount)).toFixed(2),
                              prefillNonce: String(Date.now()),
                            },
                          });
                        }}
                      >
                        <View style={styles.bankEmojiWrap}>
                          <MerchantLogo
                            merchantName={tx.merchant || tx.rawDescription || "Purchase"}
                            size={22}
                            fallbackText="💳"
                            backgroundColor="transparent"
                            borderColor="transparent"
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {tx.merchant || tx.rawDescription || "Purchase"}
                          </Text>
                          <Text style={styles.friendMeta} numberOfLines={1}>
                            {tx.dateStr || tx.date || "—"}
                          </Text>
                        </View>
                        <Text style={[styles.friendAmt, styles.balAmtOut]}>
                          −${Math.abs(Number(tx.amount)).toFixed(2)}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={darkUI.labelMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
                      </TouchableOpacity>
                      {i < allLinkedBankRows.length - 1 ? <View style={styles.rowSep} /> : null}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetClose} onPress={openBankOnWeb}>
              <Text style={styles.sheetCloseText}>Open full transactions on web</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: darkUI.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 132 },
  header: { marginBottom: 16, paddingTop: 4, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 26, fontFamily: font.black, color: darkUI.label, letterSpacing: -0.6 },
  titleSub: { fontSize: 13, fontFamily: font.medium, color: darkUI.labelMuted, marginTop: 2 },
  themeFlag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${colors.primary}CC`,
    borderWidth: 1,
    borderColor: `${colors.primary}88`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
  },
  themeFlagText: { color: "#fff", fontSize: 12, fontFamily: font.bold },
  sLabel: {
    fontSize: 11,
    fontFamily: font.extrabold,
    color: darkUI.labelMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  seeAll: { fontSize: 13, fontFamily: font.semibold, color: colors.primary },
  previewPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
    backgroundColor: `${colors.primary}1A`,
    borderColor: `${colors.primary}55`,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewPillText: { fontSize: 11, fontFamily: font.semibold, color: colors.primary },
  previewCardDim: { opacity: 0.86 },
  bankCard: {
    width: 168,
    backgroundColor: darkUI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 11,
    ...shadow.sm,
  },
  bankCardEmail: { borderColor: `${prototype.blue}66` },
  bankTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 9 },
  bankEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: darkUI.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  mailDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: prototype.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  bankMerchant: { fontSize: 13, fontFamily: font.bold, color: darkUI.label, marginBottom: 2 },
  bankHint: { fontSize: 10, fontFamily: font.regular, color: darkUI.labelMuted, marginBottom: 7 },
  bankEmailLine: { fontSize: 10, fontFamily: font.regular, color: prototype.blue, marginBottom: 7 },
  bankAmt: {
    fontSize: 20,
    fontFamily: font.black,
    color: darkUI.label,
    letterSpacing: -0.8,
    marginBottom: 9,
  },
  bankCta: {
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    backgroundColor: `${colors.primary}18`,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  bankCtaText: { fontSize: 13, fontFamily: font.extrabold, color: colors.primary },
  emptyBank: {
    backgroundColor: darkUI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    padding: 16,
  },
  emptyBankText: { fontSize: 13, fontFamily: font.regular, color: darkUI.labelMuted, lineHeight: 18 },
  emptyBankLoading: { alignItems: "center", paddingVertical: 24 },
  groupedCard: {
    backgroundColor: darkUI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    overflow: "hidden",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  friendName: { fontSize: 15, fontFamily: font.bold, color: darkUI.label },
  friendMeta: { fontSize: 12, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 2 },
  friendAmt: { fontSize: 16, fontFamily: font.black, marginRight: 4, letterSpacing: -0.3 },
  rowSep: { height: 1, backgroundColor: prototype.sep, marginLeft: 70 },
  sectionDivider: { height: 1, backgroundColor: prototype.sep },
  inlineSectionLabel: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  inlineSectionLabelAfterFriends: { paddingTop: 12 },
  inlineSectionLabelFirst: {
    paddingTop: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: prototype.sep,
  },
  inlineSectionLabelText: {
    fontSize: 11,
    fontFamily: font.extrabold,
    color: darkUI.labelMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(61,142,98,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupRowName: { fontSize: 16, fontFamily: font.semibold, color: darkUI.label },
  groupRowSub: { fontSize: 12, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 1 },
  groupRowBal: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.3, marginRight: 4 },
  balAmtIn: { color: prototype.green },
  balAmtOut: { color: prototype.red },
  balMuted: { color: darkUI.labelMuted },
  emptyFriend: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    backgroundColor: darkUI.card,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyFriendTitle: { fontSize: 16, fontFamily: font.bold, color: darkUI.labelSecondary, marginTop: 10 },
  emptyFriendSub: { fontSize: 13, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 4, textAlign: "center" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: darkUI.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: darkUI.stroke,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: darkUI.sep,
    marginBottom: 16,
  },
  allBankHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: darkUI.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: darkUI.stroke,
  },
  sheetMerchant: { fontSize: 17, fontFamily: font.extrabold, color: darkUI.label },
  sheetDate: { fontSize: 12, fontFamily: font.regular, color: darkUI.labelMuted, marginTop: 2 },
  sheetAmt: { fontSize: 22, fontFamily: font.black, color: darkUI.label, letterSpacing: -1 },
  emailBox: {
    backgroundColor: darkUI.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: darkUI.stroke,
    marginBottom: 14,
  },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  emailLbl: {
    fontSize: 10,
    fontFamily: font.bold,
    color: prototype.blue,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emailSnippet: { fontSize: 13, fontFamily: font.regular, color: darkUI.labelSecondary },
  splitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginBottom: 12,
  },
  splitBtnText: { fontSize: 16, fontFamily: font.bold, color: "#fff" },
  sheetClose: { alignItems: "center", paddingVertical: 10 },
  sheetCloseText: { fontSize: 15, fontFamily: font.semibold, color: darkUI.labelSecondary },
});
