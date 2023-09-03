import { ToggleTheme } from "@/components/toggle-theme";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header({ userId }: { userId: string | null }) {
  return (
    <header className="container flex items-center justify-between py-4">
      <Button variant="link" asChild className="px-0">
        <Link href="/">CvSU.me</Link>
      </Button>
      <div className="flex items-center gap-x-2">
        <ToggleTheme />
        {userId && (
          <div className="h-8 w-8">
            <UserButton
              afterSignOutUrl="/"
              signInUrl="/"
              afterSwitchSessionUrl="/"
              afterMultiSessionSingleSignOutUrl="/"
            />
          </div>
        )}
      </div>
    </header>
  );
}
