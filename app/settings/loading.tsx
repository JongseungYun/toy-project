import { Skeleton } from "@/components/ui/skeleton";

/** 설정이 도착하기 전에 보여준다. 카드 네 장의 자리를 그대로 잡아 둔다. */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-md" />
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
