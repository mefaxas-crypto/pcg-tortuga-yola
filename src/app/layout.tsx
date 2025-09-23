// This is the root layout that wraps everything.
// It does not participate in routing and thus does not have a locale.
// The `[locale]` folder handles all the locale-specific layout.

type Props = {
  children: React.ReactNode;
};
export default function RootLayout({children}: Props) {
  return children;
}
