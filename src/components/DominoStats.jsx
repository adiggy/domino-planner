const CLEAR = 'clear'
const DISNEY = 'disney'

function DominoStats({ grid, palette }) {
  // Count dominoes per color
  const colorCounts = {}
  let totalDominoes = 0

  grid.forEach(row => {
    row.forEach(cell => {
      totalDominoes++
      colorCounts[cell] = (colorCounts[cell] || 0) + 1
    })
  })

  // Create a map of palette colors with their quantities
  const paletteMap = {}
  let totalAvailable = 0
  palette.forEach(p => {
    paletteMap[p.hex] = { quantity: p.quantity, name: p.name }
    // Sum up available (excluding infinity)
    if (p.quantity !== Infinity) {
      totalAvailable += p.quantity
    }
  })

  // Build color stats with usage info
  const colorStats = Object.entries(colorCounts)
    .map(([color, used]) => {
      const paletteInfo = paletteMap[color] || { quantity: Infinity }
      const available = paletteInfo.quantity
      const overLimit = available !== Infinity && used > available
      const approachingLimit = available !== Infinity && !overLimit && (available - used) <= 10
      return {
        color,
        used,
        available,
        name: paletteInfo.name,
        overLimit,
        approachingLimit
      }
    })
    .sort((a, b) => {
      // Sort: Clear first, Disney second, then by usage count
      if (a.color === CLEAR) return -1
      if (b.color === CLEAR) return 1
      if (a.color === DISNEY) return -1
      if (b.color === DISNEY) return 1
      return b.used - a.used
    })

  // Check if any color is over limit or approaching
  const hasWarnings = colorStats.some(s => s.overLimit)
  const hasApproaching = colorStats.some(s => s.approachingLimit)

  const clearCount = colorCounts[CLEAR] || 0
  const disneyCount = colorCounts[DISNEY] || 0
  const coloredCount = totalDominoes - clearCount - disneyCount

  // Count unique colors used (excluding clear and disney)
  const uniqueColorsUsed = colorStats.filter(s => s.color !== CLEAR && s.color !== DISNEY).length
  // Count total available colors (excluding clear and disney)
  const totalColorsAvailable = palette.filter(p => p.hex !== CLEAR && p.hex !== DISNEY).length

  if (colorStats.length === 0) {
    return null
  }

  return (
    <section className="section stats-section">
      <h2 className="section-title">
        Domino Count
        {hasWarnings && <span className="warning-badge" title="Some colors exceed limit">!</span>}
        {!hasWarnings && hasApproaching && <span className="approaching-badge" title="Some colors approaching limit">~</span>}
      </h2>
      <div className="stats-container">
        <div className="stats-summary">
          <span className="stat-item">
            <strong>Total:</strong> {totalDominoes} / {totalAvailable}
          </span>
          <span className="stat-item colors-used">
            <strong>Colors:</strong> {uniqueColorsUsed} of {totalColorsAvailable}
          </span>
          <span className="stat-item">
            <strong>Colored:</strong> {coloredCount}
          </span>
          <span className="stat-item">
            <strong>Clear:</strong> {clearCount}
          </span>
          {disneyCount > 0 && (
            <span className="stat-item">
              <strong>Disney:</strong> {disneyCount}
            </span>
          )}
        </div>

        {colorStats.length > 0 && (
          <div className="color-counts">
            {colorStats.map(({ color, used, available, name, overLimit, approachingLimit }) => {
              const isClear = color === CLEAR
              const isDisney = color === DISNEY
              const isSpecial = isClear || isDisney

              // Display name for special colors or use palette name
              const displayName = isClear ? 'Clear' : isDisney ? 'Disney' : (name || color)

              return (
                <div
                  key={color}
                  className={`color-count-item ${overLimit ? 'over-limit' : ''} ${approachingLimit ? 'approaching-limit' : ''}`}
                  title={displayName}
                >
                  <span
                    className={`color-count-swatch ${isClear ? 'clear-swatch' : ''} ${isDisney ? 'disney-swatch' : ''}`}
                    style={!isSpecial ? { backgroundColor: color } : undefined}
                  >
                    {isClear && 'C'}
                    {isDisney && 'D'}
                  </span>
                  <span className="color-count-name">{displayName}:</span>
                  <span className="color-count-value">
                    {used}
                    {available !== Infinity && (
                      <span className="color-count-available">/{available}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {(hasWarnings || hasApproaching) && (
          <div className="stats-alerts">
            {hasWarnings && (
              <p className="stats-warning">
                Some colors exceed available quantity!
              </p>
            )}
            {hasApproaching && (
              <p className="stats-approaching">
                Some colors approaching limit (within 10).
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default DominoStats
