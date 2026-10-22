/** Readable failure path when the licensed font cannot be fetched. */
export function FallbackWordmark() {
  return (
    <div className="fallback-word" aria-label="MORTON">
      <span>MORTON</span>
      <small>FONT FALLBACK</small>
    </div>
  )
}
