import { DiscordSDK } from '@discord/embedded-app-sdk';

let discordSdk: DiscordSDK | null = null;
let isInitialized = false;

/**
 * Check if the app is running inside Discord's embedded iframe
 * Discord provides frame_id and instance_id query params when launching activities
 */
export function isRunningInDiscord(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('frame_id') && params.has('instance_id');
}

export async function setupDiscordSdk() {
  if (typeof window === 'undefined') return null;

  // Return existing instance if already initialized
  if (isInitialized && discordSdk) {
    return discordSdk;
  }

  // Check if we're actually running inside Discord
  if (!isRunningInDiscord()) {
    console.log('Not running inside Discord - standalone mode enabled');
    isInitialized = true;
    return null;
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!clientId) {
    console.warn('Discord Client ID not found - running in standalone mode');
    return null;
  }

  try {
    discordSdk = new DiscordSDK(clientId);
    await discordSdk.ready();

    console.log('Discord SDK ready');

    // Authenticate with Discord
    const authResult = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    }).catch(err => {
      console.error('Authorization failed:', err);
      return null;
    });

    if (!authResult || !authResult.code) {
      console.warn('No authorization code received, skipping token exchange');
      isInitialized = true;
      return discordSdk;
    }

    console.log('Got authorization code');

    // Exchange code for access token with your backend
    const response = await fetch('/api/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authResult.code }),
    }).catch(err => {
      console.error('Token exchange request failed:', err);
      return null;
    });

    if (!response || !response.ok) {
      console.warn('Token exchange failed, continuing without authentication');
      isInitialized = true;
      return discordSdk;
    }

    const { access_token } = await response.json();

    // Authenticate with Discord SDK
    const auth = await discordSdk.commands.authenticate({ access_token }).catch(err => {
      console.error('Authentication failed:', err);
      return null;
    });

    if (auth) {
      console.log('Discord authenticated:', auth.user?.username);
    }

    isInitialized = true;
    return discordSdk;
  } catch (error) {
    console.error('Discord SDK setup failed:', error);
    // Still return the SDK even if auth failed, as basic functionality may work
    isInitialized = true;
    return discordSdk;
  }
}

export function getDiscordSdk() {
  return discordSdk;
}

export function isDiscordActivity() {
  // Check if actually running in Discord's iframe, or if env flag is set
  return isRunningInDiscord() ||
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_IS_DISCORD_ACTIVITY === 'true');
}

export async function getDiscordUser() {
  if (!discordSdk) return null;

  try {
    // @ts-ignore - Discord SDK types may not be fully updated
    const user = await discordSdk.commands.getUser();
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    };
  } catch (error) {
    console.error('Failed to get Discord user:', error);
    return null;
  }
}

export function getVoiceChannelId() {
  return discordSdk?.channelId || null;
}

export function getGuildId() {
  return discordSdk?.guildId || null;
}

// Generate room code from voice channel ID
export function getChannelBasedRoomCode() {
  const channelId = getVoiceChannelId();
  if (!channelId) return null;

  // Use last 6 characters of channel ID as room code
  return channelId.slice(-6).toUpperCase();
}
