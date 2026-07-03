// The login form reads env config in its server action at request time and
// there's no useful static shell to precompute — force dynamic rendering.
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
