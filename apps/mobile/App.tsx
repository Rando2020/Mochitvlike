import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase, webBaseUrl } from "./src/supabase";
import { theme } from "./src/theme";

type Show = { id: string; title: string; status: string; updated_at: string;
  blueprint: { identity?: { logline?: string; genres?: string[] }; cast?: Array<{ id: string; name: string; role?: string; storyFunction?: string }>;
    episodeOne?: { hook?: string; beats?: Array<{ id: string; summary?: string; description?: string; storyChange?: string }> } } };
function Action({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.action, secondary ? styles.secondary : styles.primary, (disabled || pressed) && styles.faded]}>
    <Text style={[styles.actionText, secondary && { color: theme.text }]}>{label}</Text>
  </Pressable>;
}
function Mark() {
  return <View style={styles.mark} accessibilityLabel="Crayvo logo"><Text style={styles.markText}>C</Text><Text style={styles.spark}>✦</Text></View>;
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [shows, setShows] = useState<Show[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loadingShows, setLoadingShows] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) { setSession(error ? null : data.session); setChecking(false); }
    }).catch(() => { if (mounted) { setAuthError("Could not check your session. Check your connection."); setChecking(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) { setSession(next); if (!next) { setShows([]); setSelectedId(null); } }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const loadShows = useCallback(async () => {
    if (!supabase || !session) return;
    setLoadingShows(true); setLoadError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Your session expired. Sign in again.");
      const { data, error } = await supabase.from("series")
        .select("id,title,status,blueprint,updated_at")
        .eq("creator_id", user.id)
        .neq("status", "ARCHIVED")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw new Error("Could not load your shows. Verify the app uses the same Supabase project as your web studio.");
      setShows((data ?? []) as Show[]);
    } catch (e) { setLoadError(e instanceof Error ? e.message : "Could not load your shows."); }
    finally { setLoadingShows(false); }
  }, [session?.user.id]);

  useEffect(() => { if (session) void loadShows(); }, [session?.user.id, loadShows]);

  async function signIn() {
    if (!supabase || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("Sign-in failed. Check your email and password.");
      setPassword("");
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setAuthBusy(false); }
  }
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) Alert.alert("Sign-out failed", "Check your connection and try again.");
  }
  async function openWebStudio() {
    if (!/^https:\/\/[^/]+/.test(webBaseUrl) || webBaseUrl.includes("YOUR-")) {
      Alert.alert("Web Studio not connected", "Set EXPO_PUBLIC_WEB_BASE_URL to a verified Crayvo deployment.");
      return;
    }
    const url = webBaseUrl.replace(/\/$/, "") + "/create";
    try { await Linking.openURL(url); } catch { Alert.alert("Could not open Studio", "Please try again."); }
  }

  const current = shows.find(s => s.id === selectedId);
  if (!isConfigured) return <View style={styles.full}><StatusBar barStyle="light-content" /><Mark /><Text style={styles.title}>Crayvo setup</Text>
    <Text style={styles.muted}>The native app is installed, but it isn't connected to your creator database. Configure public Supabase credentials in apps/mobile/.env and restart Expo. Do not use a service role key.</Text></View>;
  if (checking) return <View style={styles.full}><StatusBar barStyle="light-content" /><Mark /><ActivityIndicator color={theme.accent} /><Text style={styles.muted}>Checking your creator account…</Text></View>;
  if (!session) return <KeyboardAvoidingView style={styles.full} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <StatusBar barStyle="light-content" /><ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
      <Mark /><Text style={styles.eyebrow}>STORIES BECOME WORLDS</Text><Text style={styles.title}>Your studio, wherever you are.</Text>
      <Text style={styles.muted}>Sign in with the same creator account you use on the web.</Text>
      <Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="username" autoComplete="email" accessibilityLabel="Email" />
      <Text style={styles.label}>Password</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="current-password" accessibilityLabel="Password" />
      {authError ? <Text style={styles.error} accessibilityRole="alert">{authError}</Text> : null}
      <Action label={authBusy ? "Signing in…" : "Sign in to Crayvo"} onPress={() => void signIn()} disabled={authBusy || !email.trim() || !password} />
      <Text style={styles.caption}>Crayvo mobile uses your existing project. No new creator accounts or media jobs are created here.</Text>
    </ScrollView></KeyboardAvoidingView>;

  return <View style={styles.full}>
    <StatusBar barStyle="light-content" />
    <View style={styles.top}><View style={styles.brandRow}><Mark /><View><Text style={styles.brandName}>CRAYVO</Text><Text style={styles.caption}>YOUR CREATIVE STUDIO</Text></View></View>
      <Pressable accessibilityRole="button" onPress={() => void signOut()} hitSlop={12}><Text style={styles.signOut}>Sign out</Text></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingShows} onRefresh={() => void loadShows()} tintColor={theme.accent} />}>
      {current ? <>
        <Pressable accessibilityRole="button" onPress={() => setSelectedId(null)}><Text style={styles.back}>‹ All shows</Text></Pressable>
        <Text style={styles.eyebrow}>YOUR WORLD</Text><Text style={styles.title}>{current.title}</Text>
        <Text style={styles.muted}>{current.blueprint?.identity?.logline || "Your saved story foundation."}</Text>
        <Text style={styles.heading}>Episode 1</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>The opening</Text><Text style={styles.muted}>{current.blueprint?.episodeOne?.hook || "Open the web studio to review your episode."}</Text></View>
        {(current.blueprint?.episodeOne?.beats ?? []).map((beat, i) =>
          <View key={beat.id || String(i)} style={styles.card}><Text style={styles.kicker}>BEAT {i + 1}</Text>
          <Text style={styles.muted}>{beat.summary || beat.description || beat.storyChange || "Story beat saved."}</Text></View>)}
        <Text style={styles.heading}>Cast</Text>
        {(current.blueprint?.cast ?? []).map(member => <View key={member.id} style={styles.card}>
          <Text style={styles.cardTitle}>{member.name}</Text><Text style={styles.kicker}>{member.role || "Character"}</Text>
          <Text style={styles.muted}>{member.storyFunction || ""}</Text></View>)}
        <Text style={styles.caption}>This is your saved story plan, not rendered video. Generation and editing remain in the browser Studio.</Text>
      </> : <>
        <Text style={styles.eyebrow}>YOUR STORIES, ANYWHERE</Text>
        <Text style={styles.title}>Make something worth imagining.</Text>
        <Text style={styles.muted}>Explore the worlds you've saved, or create your next show in the browser Studio.</Text>
        <Action label="✦  Create a show in browser" onPress={() => void openWebStudio()} />
        <View style={styles.row}><Text style={styles.heading}>Your shows</Text><Text style={styles.caption}>{shows.length} saved</Text></View>
        {loadError ? <View style={styles.card}><Text style={styles.error}>{loadError}</Text><Action secondary label="Try again" onPress={() => void loadShows()} /></View> : null}
        {!loadingShows && shows.length === 0 && !loadError ? <View style={styles.card}><Text style={styles.cardTitle}>Your first world starts with one idea.</Text><Text style={styles.muted}>Create a show on the web, save it, then pull down here to refresh.</Text></View> : null}
        {shows.map(show => <Pressable key={show.id} accessibilityRole="button" onPress={() => setSelectedId(show.id)}
          style={({ pressed }) => [styles.card, pressed && styles.faded]}>
          <Text style={styles.kicker}>{show.blueprint?.identity?.genres?.slice(0, 2).join(" • ") || "ORIGINAL SERIES"}</Text>
          <Text style={styles.cardTitle}>{show.title}</Text>
          <Text style={styles.muted} numberOfLines={3}>{show.blueprint?.identity?.logline || "Saved in your studio."}</Text>
          <Text style={styles.open}>Explore story →</Text>
        </Pressable>)}
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? 28 : 50 },
  content: { padding: 22, paddingBottom: 50, gap: 16 },
  loginContent: { flexGrow: 1, justifyContent: "center", padding: 30, gap: 16 },
  mark: { width: 48, height: 48, borderWidth: 2, borderColor: theme.accent, borderRadius: 16,
    backgroundColor: "#242034", alignItems: "center", justifyContent: "center", position: "relative" },
  markText: { fontSize: 33, fontWeight: "900", color: theme.accent },
  spark: { position: "absolute", right: 2, top: 0, fontSize: 12, color: theme.mint },
  title: { fontSize: 37, lineHeight: 43, letterSpacing: -1.4, fontWeight: "900", color: theme.text },
  eyebrow: { color: theme.mint, fontSize: 11, letterSpacing: 2.1, fontWeight: "800" },
  muted: { color: theme.subdued, fontSize: 15, lineHeight: 23 },
  caption: { color: theme.subdued, fontSize: 11, lineHeight: 18 },
  label: { color: theme.text, fontSize: 14, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: theme.stroke, borderRadius: 13, backgroundColor: theme.panel,
    paddingHorizontal: 15, paddingVertical: 14, color: theme.text, minHeight: 52 },
  action: { borderRadius: 15, minHeight: 52, justifyContent: "center", alignItems: "center", padding: 14, marginTop: 8 },
  primary: { backgroundColor: "#927BFA" },
  secondary: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke },
  faded: { opacity: 0.65 },
  actionText: { color: "#10101b", fontSize: 15, fontWeight: "900" },
  error: { color: theme.danger, fontSize: 14, lineHeight: 22 },
  top: { paddingHorizontal: 22, paddingBottom: 18, borderBottomWidth: 1, borderColor: theme.stroke,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  brandName: { color: theme.text, fontSize: 17, fontWeight: "950", letterSpacing: 2 },
  signOut: { color: theme.accent, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 },
  heading: { color: theme.text, fontSize: 22, fontWeight: "800", marginTop: 12 },
  card: { backgroundColor: theme.panel, borderColor: theme.stroke, borderWidth: 1,
    borderRadius: 19, padding: 20, gap: 9 },
  cardTitle: { color: theme.text, fontSize: 21, fontWeight: "800" },
  kicker: { color: theme.accent, fontWeight: "800", fontSize: 10, letterSpacing: 1.4 },
  open: { color: theme.mint, marginTop: 8, fontWeight: "800", fontSize: 13 },
  back: { color: theme.accent, marginBottom: 12, fontWeight: "700", fontSize: 15 }
});
