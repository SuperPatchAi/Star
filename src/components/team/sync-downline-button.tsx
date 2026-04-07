"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { syncDownline } from "@/lib/actions/team";

export function SyncDownlineButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSync() {
    startTransition(async () => {
      const { count, error } = await syncDownline();

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(`Synced ${count} downline member${count !== 1 ? "s" : ""}`);
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleSync}
      className="gap-1.5"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Sync Downline
    </Button>
  );
}
