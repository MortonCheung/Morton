/** Layered, art-directed backdrop: a cyclorama gradient, a soft light pool with
 * an upper-left key bias, and a warm floor bounce. The subject's shadow is a
 * separate silhouette layer (ShadowLayer), not a blurred blob. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__base" />
      <div className="backdrop__pool" />
      <div className="backdrop__floor" />
      <div className="backdrop__grain" />
      <div className="backdrop__vignette" />
    </div>
  )
}
