export function SkeletonText() {
  return <div className="shimmer h-4 w-40" />
}

export function SkeletonMoney() {
  return <div className="shimmer h-7 w-36" />
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex h-[52px] items-center border-b border-[var(--line-1)] px-4"
        >
          <div className="shimmer h-4 w-40" />
          <div className="shimmer ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
