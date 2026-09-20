// One place for everything brand- and store-related.
// Values with a NEXT_PUBLIC_* override are baked in at build time.

const env = (value: string | undefined, fallback: string) => (value && value.trim() ? value.trim() : fallback)

// "Taboo" is a Hasbro trademark: the store builds (npm run build:mobile) must not
// ship it as the product name. The website keeps whatever NEXT_PUBLIC_APP_NAME says.
export const APP_NAME = env(process.env.NEXT_PUBLIC_APP_NAME, 'Taboo')
// The legal pages are the ones linked from the store listings, so they always carry
// the store name, whatever the website calls itself.
export const LEGAL_APP_NAME = env(process.env.NEXT_PUBLIC_LEGAL_APP_NAME, 'Inferno Words')
export const APP_TAGLINE = 'The forbidden-words party game'

// Shown on the privacy/terms pages and used for abuse reports. Set before publishing.
export const SUPPORT_EMAIL = env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, 'support@example.com')
export const PUBLISHER_NAME = env(process.env.NEXT_PUBLIC_PUBLISHER_NAME, 'Ishpreet')

// Public website. Native apps use it for invite links and legal pages.
export const WEB_URL = env(process.env.NEXT_PUBLIC_WEB_URL, 'https://taboo-inferno.vercel.app').replace(/\/$/, '')

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------
// The game is free: no ads, no purchases, nothing locked. It is funded by voluntary
// donations (UPI). The donate button is shown on the WEBSITE only: both app stores
// restrict in-app donation links to developers, so the store apps don't show it.
const UPI_ID = env(process.env.NEXT_PUBLIC_UPI_ID, 'ishpreet.contact@okaxis')

export const DONATE = {
  upiId: UPI_ID,
  // Opens the phone's UPI app chooser with the payee filled in (amount left to the donor)
  upiLink: `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PUBLISHER_NAME)}&cu=INR&tn=${encodeURIComponent('Support the game')}`,
}
