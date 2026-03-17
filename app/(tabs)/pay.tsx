import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { StripeTerminalProvider, useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import type { Reader } from "@stripe/stripe-terminal-react-native";
import { ErrorCode } from "@stripe/stripe-terminal-react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useApiFetch } from "../../lib/api";
import { colors, font, fontSize, shadow, radii, space } from "../../lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

function PayScreenInner() {
  const params = useLocalSearchParams<{
    amount?: string;
    groupId?: string;
    payerMemberId?: string;
    receiverMemberId?: string;
  }>();
  const apiFetch = useApiFetch();
  const [amount, setAmount] = useState(params.amount ?? "");
  const [connecting, setConnecting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader.Type[]>([]);

  const {
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    isInitialized,
    connectedReader,
    collectPaymentMethod,
    processPaymentIntent,
    retrievePaymentIntent,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => setDiscoveredReaders(readers),
    onDidDisconnect: () => {
      setConnecting(false);
      Alert.alert("Disconnected", "Tap to Pay reader disconnected.");
    },
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (params.amount) setAmount(params.amount);
  }, [params.amount]);

  useEffect(() => {
    if (!isInitialized) return;
    discoverReaders({ discoveryMethod: "tapToPay" });
  }, [isInitialized, discoverReaders]);

  const connectTapToPay = useCallback(async () => {
    if (!isInitialized) return;

    const reader = discoveredReaders[0];
    if (!reader) {
      Alert.alert(
        "No reader",
        "Tap to Pay not available. Requires compatible iPhone (XS+) or Android with NFC."
      );
      return;
    }

    setConnecting(true);
    try {
      const locRes = await apiFetch("/api/stripe/terminal/location");
      const locData = await locRes.json();
      const locationId = locData.locationId;

      if (!locationId) {
        Alert.alert("Error", "Could not get Terminal location. Ensure Stripe is configured.");
        setConnecting(false);
        return;
      }

      const connectResult = await connectReader({
        discoveryMethod: "tapToPay",
        reader,
        locationId,
        autoReconnectOnUnexpectedDisconnect: true,
      });

      if (connectResult.error) {
        Alert.alert("Connection failed", connectResult.error.message ?? "Could not connect");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [isInitialized, discoveredReaders, connectReader, apiFetch]);

  const disconnect = useCallback(async () => {
    await disconnectReader();
  }, [disconnectReader]);

  const collectPayment = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount to collect");
      return;
    }

    if (!connectedReader) {
      Alert.alert("Not connected", "Connect to Tap to Pay first");
      return;
    }

    setCollecting(true);
    try {
      const body: Record<string, unknown> = { amount: amt };
      if (params.groupId && params.payerMemberId && params.receiverMemberId) {
        body.groupId = params.groupId;
        body.payerMemberId = params.payerMemberId;
        body.receiverMemberId = params.receiverMemberId;
      }
      const piRes = await apiFetch("/api/stripe/terminal/create-payment-intent", {
        method: "POST",
        body,
      });
      const piData = await piRes.json();
      const clientSecret = piData.clientSecret;

      if (!clientSecret) {
        Alert.alert("Error", piData.error ?? "Failed to create payment intent");
        setCollecting(false);
        return;
      }

      const retrieveResult = await retrievePaymentIntent(clientSecret);
      if (retrieveResult.error || !retrieveResult.paymentIntent) {
        Alert.alert("Error", retrieveResult.error?.message ?? "Could not load payment");
        setCollecting(false);
        return;
      }

      const collectResult = await collectPaymentMethod({
        paymentIntent: retrieveResult.paymentIntent,
      });
      if (collectResult.error) {
        if (collectResult.error.code === ErrorCode.CANCELED) {
          setCollecting(false);
          return;
        }
        Alert.alert("Collection failed", collectResult.error.message ?? "Could not collect payment");
        setCollecting(false);
        return;
      }

      if (!collectResult.paymentIntent) {
        setCollecting(false);
        return;
      }

      const processResult = await processPaymentIntent({
        paymentIntent: collectResult.paymentIntent,
      });
      if (processResult.error) {
        Alert.alert("Payment failed", processResult.error.message ?? "Could not process payment");
      } else {
        setLastPayment(`Paid $${amt.toFixed(2)} successfully`);
        setAmount("");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Payment failed");
    } finally {
      setCollecting(false);
    }
  }, [
    amount,
    params.groupId,
    params.payerMemberId,
    params.receiverMemberId,
    connectedReader,
    apiFetch,
    retrievePaymentIntent,
    collectPaymentMethod,
    processPaymentIntent,
  ]);

  const isConnected = !!connectedReader;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tap to Pay</Text>
      <Text style={styles.subtitle}>
        Accept contactless payments with your phone. No reader required.
      </Text>

      {!API_URL && (
        <Text style={styles.warning}>
          Set EXPO_PUBLIC_API_URL to your deployed web app URL.
        </Text>
      )}

      {/* Connect / Disconnect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Reader: {isConnected ? "Connected" : "Not connected"}
        </Text>
        {isConnected ? (
          <TouchableOpacity
            style={[styles.button, styles.disconnectButton]}
            onPress={disconnect}
            disabled={connecting}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, connecting && styles.buttonDisabled]}
            onPress={connectTapToPay}
            disabled={connecting || !isInitialized || discoveredReaders.length === 0}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {!isInitialized
                  ? "Initializing…"
                  : discoveredReaders.length === 0
                  ? "Tap to Pay not available"
                  : "Connect Tap to Pay"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Amount & Collect */}
      {isConnected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            editable={!collecting}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (!amount || parseFloat(amount) <= 0 || collecting) && styles.buttonDisabled,
            ]}
            onPress={collectPayment}
            disabled={!amount || parseFloat(amount) <= 0 || collecting}
          >
            {collecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Collect payment</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {lastPayment && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Last result</Text>
          <Text style={styles.resultText}>{lastPayment}</Text>
        </View>
      )}

      <Text style={styles.hint}>
        Tap to Pay does not work in Expo Go. Run{" "}
        <Text style={styles.hintCode}>expo run:ios</Text> or{" "}
        <Text style={styles.hintCode}>expo run:android</Text> to build with native Stripe support.
        {"\n"}iOS: iPhone XS or later. Android: NFC device, API 26+.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: font.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: font.regular,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  warning: {
    fontSize: 13,
    fontFamily: font.regular,
    color: colors.red,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: font.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    fontSize: 18,
    fontFamily: font.regular,
    color: colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    alignItems: "center",
  },
  disconnectButton: {
    backgroundColor: colors.textTertiary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: font.semibold,
  },
  result: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
  },
  resultLabel: {
    fontSize: 12,
    fontFamily: font.regular,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    fontFamily: font.regular,
    color: colors.textMuted,
    lineHeight: 18,
  },
  hintCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: colors.borderLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default function PayScreen() {
  const { getToken } = useAuth();

  const fetchConnectionToken = useCallback(async () => {
    let token: string | null = null;
    for (let i = 0; i < 4; i++) {
      token = await getToken({ skipCache: i > 0 });
      if (token) break;
      if (i < 3) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
    const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/stripe/terminal/connection-token`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to get connection token");
    return data.secret;
  }, [getToken]);

  return (
    <StripeTerminalProvider logLevel="error" tokenProvider={fetchConnectionToken}>
      <PayScreenInner />
    </StripeTerminalProvider>
  );
}
