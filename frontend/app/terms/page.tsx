import LegalPage from '@/components/LegalPage'
import { LEGAL_APP_NAME as APP_NAME, PUBLISHER_NAME, SUPPORT_EMAIL } from '@/lib/appConfig'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: `Terms of Use - ${APP_NAME}` }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="20 September 2026">
      <p>
        By using {APP_NAME} (the &quot;Game&quot;), published by {PUBLISHER_NAME}, you agree to these terms. If you do
        not agree, please do not use the Game.
      </p>

      <h2>1. Playing fair and keeping it friendly</h2>
      <p>
        Rooms are private spaces between you and the people you share a room code with. Nicknames, guesses and word
        suggestions are content created by players. There is{' '}
        <strong>no tolerance for objectionable content or abusive behaviour</strong>. You agree not to use the Game to:
      </p>
      <ul>
        <li>harass, threaten, or discriminate against anyone, or share sexual, hateful or illegal content;</li>
        <li>impersonate others or choose offensive nicknames;</li>
        <li>cheat, disrupt rooms, or attempt to interfere with other players&apos; devices or connections.</li>
      </ul>
      <p>
        Room hosts and co-admins can remove (kick) any player from a room at any time; a removed player cannot rejoin
        that room. To report abuse, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the room code
        and what happened; we review reports promptly.
      </p>

      <h2>2. Peer-to-peer play</h2>
      <p>
        The Game runs on players&apos; devices. If the host closes the Game or loses their connection for too long,
        the room ends. We do not guarantee that a connection between any two devices or networks can be established.
      </p>

      <h2>3. Purchases</h2>
      <p>
        Optional one-time purchases (such as &quot;Remove Ads&quot; and &quot;Premium Word Packs&quot;) are sold
        through Google Play or the Apple App Store and are subject to their terms, including their refund policies.
        Purchases are tied to your store account and can be restored from the Store screen. Premium word packs apply
        to rooms you host.
      </p>

      <h2>4. Intellectual property</h2>
      <p>
        The Game, its word lists and artwork belong to {PUBLISHER_NAME}. {APP_NAME} is an independent game and is not
        affiliated with, sponsored by, or endorsed by any board-game publisher.
      </p>

      <h2>5. Disclaimer and liability</h2>
      <p>
        The Game is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted by law,{' '}
        {PUBLISHER_NAME} is not liable for indirect or consequential damages arising from your use of the Game. Nothing
        in these terms limits rights you have under mandatory consumer law.
      </p>

      <h2>6. Changes</h2>
      <p>We may update these terms; continued use after an update means you accept the new terms.</p>

      <h2>7. Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalPage>
  )
}
