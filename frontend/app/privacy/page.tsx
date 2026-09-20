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
          chosen theme are stored on your device so you can reconnect after a dropped connection. A host&apos;s
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

      <h2>3. No ads, no purchases, no tracking</h2>
      <p>
        The Game shows no advertising, sells nothing, and contains no analytics or advertising SDKs. It does not use
        advertising identifiers and does not track you across apps or websites.
      </p>

      <h2>4. Donations (website only)</h2>
      <p>
        The website offers an optional way to support the Game through UPI. Payments are made in your own UPI app
        directly to the publisher; the Game never sees or handles your payment details. As with any UPI transfer, the
        recipient can see the payer name and UPI reference shown by the banking system. Donating unlocks nothing: the
        whole Game is free either way.
      </p>

      <h2>5. What we do not do</h2>
      <ul>
        <li>We do not require an account, email address, phone number, contacts, camera, microphone or precise location.</li>
        <li>We do not sell your personal information.</li>
      </ul>

      <h2>6. Children</h2>
      <p>
        The Game is not directed to children under 13 (or the higher age required in your country), and we do not
        knowingly collect personal information from them. If you believe a
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
