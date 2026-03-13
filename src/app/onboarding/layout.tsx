export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100vh] min-h-dvh bg-background">
      {children}
    </div>
  );
}
