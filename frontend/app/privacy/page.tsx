import LegalPage from '@/components/LegalPage'
import { LEGAL_APP_NAME as APP_NAME, PUBLISHER_NAME, SUPPORT_EMAIL } from '@/lib/appConfig'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: `Privacy Policy - ${APP_NAME}` }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="20 September 2026">
      <p>
        This policy explains what information {APP_NAME} (the website and the Android and iOS apps, together the
        &quot;Game&quot;) handles, and why. The Game is published by {PUBLISHER_NAME}. It has no user accounts and is
        designed to work with as little data as possible.
      </p>

      <h2>1. How the Game works (peer-to-peer)</h2>
      <p>
        Games are played directly between the players&apos; devices. The player who creates a room (the
        &quot;host&quot;) runs the game on their own device, and the other players connect to it over an encrypted
        WebRTC connection. We do not operate game servers and do not store your games.
      </p>

      <h2>2. Information handled</h2>
      <ul>
        <li>
          <strong>Nickname and gameplay.</strong> The nickname you type, your team, guesses and scores are sent to the
          host&apos;s device and to the other players in your room so the game can be played. They are kept in memory
          for the duration of the room and are not sent to us.
        </li>
        <li>
          <strong>On-device storage.</strong> A random session identifier, your last nickname and room code, and your
          purchase status are stored on your device so you can reconnect after a dropped connection. A host&apos;s
          device also keeps a temporary copy of the room so it can recover from a reload.
        </li>
        <li>
          <strong>IP address.</strong> To connect devices, your IP address is necessarily visible to the connection
          (signaling and relay) service we use, PeerJS, and, as with any peer-to-peer connection, to the devices of
          the other players in your room. Only join rooms with people you trust.
        </li>
        <li>
          <strong>Word feedback and suggestions (optional).</strong> If you rate a word or suggest a new one, the
          word, your rating or suggestion, your nickname and the room code may be sent to a spreadsheet we use to
          improve the word lists.
        </li>
        <li>
          <strong>Website hosting.</strong> Our hosting provider processes standard request logs (IP address, browser
          type, time) to deliver and secure the website.
        </li>
      </ul>

      <h2>3. Advertising (Android and iOS apps only)</h2>
      <p>
        The apps show ads through Google AdMob. Google may collect and use device identifiers (such as the advertising
        ID), IP address, approximate location derived from it, and ad interaction and diagnostic data to serve and
        measure ads, and, where you have agreed, to personalise them. Where the law requires it, you are asked for
        consent before any ad is requested, and you can change your choice at any time under Store &rarr; &quot;Ad
        privacy choices&quot;. On iOS, tracking only happens if you allow it in the system prompt. See{' '}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          how Google uses information from apps that use its services
        </a>
        . The &quot;Remove Ads&quot; purchase turns ads off entirely. The website shows no ads.
      </p>

      <h2>4. Purchases (apps only)</h2>
      <p>
        Purchases are processed by Google Play or the Apple App Store. We never see your payment details. We use
        RevenueCat to verify purchases and unlock what you bought; it receives an anonymous, randomly generated app
        user ID and your purchase history for this app. See the{' '}
        <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer">RevenueCat privacy policy</a>.
      </p>

      <h2>5. What we do not do</h2>
      <ul>
        <li>We do not require an account, email address, phone number, contacts, camera, microphone or precise location.</li>
        <li>We do not sell your personal information.</li>
      </ul>

      <h2>6. Children</h2>
      <p>
        The Game is not directed to children under 13 (or the higher age required in your country), and we do not
        knowingly collect personal information from them. Ads are not configured as child-directed. If you believe a
        child has provided personal information, contact us and we will help remove it.
      </p>

      <h2>7. Retention and deletion</h2>
      <p>
        Game data disappears when the room closes. Data stored on your device can be deleted at any time by clearing
        the site data in your browser or by uninstalling the app (or clearing its storage). To ask about word
        feedback you submitted, or to exercise rights you have under laws such as the GDPR or CCPA, email us.
      </p>

      <h2>8. Changes</h2>
      <p>We will update this page when the policy changes and revise the date above.</p>

      <h2>9. Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalPage>
  )
}
