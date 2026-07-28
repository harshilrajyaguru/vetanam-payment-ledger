/**
 * Skeleton loading placeholder.
 * Renders `count` skeleton bars with given height and optional gap.
 */
export function SkeletonLoader({ count = 3, height = '2.5rem', gap = '0.6rem' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height,
            width: i % 3 === 2 ? '75%' : '100%',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default SkeletonLoader;
