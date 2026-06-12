interface LoadingSkeletonProps {
  type?: 'card' | 'stat' | 'list' | 'bubble' | 'chart' | 'dashboard';
  count?: number;
}

export default function LoadingSkeleton({ type = 'card', count = 3 }: LoadingSkeletonProps) {
  if (type === 'stat') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-8 w-16" />
              </div>
              <div className="skeleton h-12 w-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4 animate-fade-in">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="skeleton h-6 w-3/4 mb-4" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-5/6 mb-4" />
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    // Single chart card placeholder — a bar/line silhouette + axis ticks.
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-5 w-48" />
          <div className="flex gap-2">
            <div className="skeleton h-7 w-12 rounded-lg" />
            <div className="skeleton h-7 w-12 rounded-lg" />
            <div className="skeleton h-7 w-12 rounded-lg" />
          </div>
        </div>
        <div className="flex items-end gap-2 h-64 px-2">
          {[60, 80, 45, 90, 55, 75, 50, 95, 70, 85, 65, 78].map((h, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-md skeleton" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex justify-between mt-3 px-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-3 w-8" />)}
        </div>
      </div>
    );
  }

  if (type === 'dashboard') {
    // Full-page dashboard skeleton: hero + KPI strip + 2-column charts + activity list.
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 h-48 p-8">
          <div className="skeleton h-7 w-1/3 mb-3 bg-white/40" />
          <div className="skeleton h-12 w-32 mb-2 bg-white/40" />
          <div className="skeleton h-4 w-1/4 bg-white/40" />
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-8 w-8 rounded-lg" />
              </div>
              <div className="skeleton h-8 w-24 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
        {/* 2 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="skeleton h-5 w-48 mb-4" />
            <div className="flex items-end gap-2 h-48">
              {[60, 80, 45, 90, 55, 75, 50, 95, 70, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-md skeleton" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="skeleton h-5 w-32 mb-4" />
            <div className="flex items-center justify-center h-48">
              <div className="skeleton h-36 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'bubble') {
    return (
      <div className="relative h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-gray-200 animate-fade-in">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block">
              <div className="skeleton h-20 w-20 rounded-full mb-4 mx-auto" />
              <div className="skeleton h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-in">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="skeleton h-6 w-1/2 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
