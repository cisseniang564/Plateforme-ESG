interface LoadingSkeletonProps {
  type?: 'card' | 'stat' | 'list' | 'bubble';
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
