export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1600px] px-4 pb-14 pt-6 lg:px-6">{children}</div>;
}
