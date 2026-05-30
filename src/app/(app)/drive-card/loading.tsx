import { FormSkeleton } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <FormSkeleton />
    </div>
  );
}
