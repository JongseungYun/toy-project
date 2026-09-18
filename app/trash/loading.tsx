import { LibrarySkeleton } from "@/components/notes/library-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** 휴지통이 도착하기 전에 보여준다. */
export default function Loading() {
  return (
    <LibrarySkeleton>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-7 w-32 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </LibrarySkeleton>
  );
}
