import { LibrarySkeleton, NoteSkeleton } from "@/components/notes/library-skeleton";

/** 노트를 누른 순간 바로 보여준다. 내용은 도착하는 대로 이 자리에 채워진다. */
export default function Loading() {
  return (
    <LibrarySkeleton narrow="detail">
      <NoteSkeleton />
    </LibrarySkeleton>
  );
}
