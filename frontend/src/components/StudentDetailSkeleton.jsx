export default function StudentDetailSkeleton() {
  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="mx-auto mt-4 h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mx-auto mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-3">
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-3">
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
              <div className="mt-6 grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, index) => (
                  <div key={index} className="h-13 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
