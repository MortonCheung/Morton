/**
 * Explicit resource ownership for the Three.js scene.
 *
 * Shapes/materials/textures are registered here and disposed exactly once, no matter how
 * many meshes reference them (notably the two O meshes sharing one glyph geometry).
 * Meshes never dispose their own resources; the SceneController owns this registry.
 */
type Disposable = { dispose: () => void }

export class ResourceRegistry {
  private geometries = new Set<Disposable>()
  private materials = new Set<Disposable>()
  private textures = new Set<Disposable>()
  private others = new Set<Disposable>()
  private disposed = false

  addGeometry(...items: Disposable[]): void {
    for (const item of items) this.geometries.add(item)
  }

  addMaterial(...items: Disposable[]): void {
    for (const item of items) this.materials.add(item)
  }

  addTexture(...items: Disposable[]): void {
    for (const item of items) this.textures.add(item)
  }

  addOther(...items: Disposable[]): void {
    for (const item of items) this.others.add(item)
  }

  get counts(): { geometries: number; materials: number; textures: number; others: number } {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
      others: this.others.size,
    }
  }

  /** Dispose every registered resource exactly once. Idempotent. */
  disposeAll(): void {
    if (this.disposed) return
    this.disposed = true
    for (const item of this.geometries) item.dispose()
    for (const item of this.materials) item.dispose()
    for (const item of this.textures) item.dispose()
    for (const item of this.others) item.dispose()
    this.geometries.clear()
    this.materials.clear()
    this.textures.clear()
    this.others.clear()
  }

  get isDisposed(): boolean {
    return this.disposed
  }
}
