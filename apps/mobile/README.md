# Crayvo mobile (native Expo MVP)

This is a **native React Native app**, not a WebView wrapper. It signs in with the same Supabase Auth accounts as the web Studio and reads the current user's saved series through existing owner RLS policies. It displays Episode 1 beats and cast. Editing and generation explicitly open the browser Studio until native API authorization is designed and reviewed.

## Windows and iPhone development

1. Install Node 22.
2. From this folder run `npm install`, then `npx expo install --fix` (SDK 57 dependency alignment), then `npm run check`.
3. Copy `.env.example` to `.env`. Fill *public* Supabase URL and publishable key from the same environment as the web preview. Set `EXPO_PUBLIC_WEB_BASE_URL` to an actual verified HTTPS deployment.
4. Run `npx expo start` and open via Expo Go if compatible with the installed Expo version. Alternatively use an Expo development build. An iOS simulator requires macOS, but you can use an iPhone from Windows.
5. Before TestFlight, configure an owned bundle identifier, Apple Developer account, Expo EAS project, iOS icon/splash and privacy disclosures. No TestFlight package has been built or distributed here.

No new Supabase project, schema, migrations, privileged API, GPU calls, billing, or publishing are included. The existing site and mobile must use the *same intended environment*. Never put a `service_role` or database password in the Expo app. The current session storage follows Supabase's Expo SQLite quickstart; assess encrypted storage before production release.
