import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const isConfigured = /^https:\/\/[^/]+/.test(url) && key.length > 16 && !url.includes("YOUR-");
export const webBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "";

/** Only a public publishable key is permitted. RLS remains mandatory. */
export const supabase = isConfigured ? createClient(url, key, {
  auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
}) : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", state => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
