const CLEAR = 'clear'

function DominoStats({ grid, palette }) {
  // Count dominoes per color
  const colorCounts = {}
  let totalDominoes = 0
  let clearCount = 0

  grid.forEach(row => {
    row.forEach(cell => {
      totalDominoes++
      if (cell === CLEAR) {
        clearCount++
      } else {
        colorCounts[cell] = (colorCounts[cell] || 0) + 1
      }
    })
  })

  const coloredCount = totalDominoes - clearCount

  // Sort colors by count (descending)
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])

  if (sortedColors.length === 0 && clearCount === totalDominoes) {
    return null // Don't show stats if grid is empty
  }

  return (
    <section className="section stats-section">
      <h2 className="section-title">Domino Count</h2>
      <div className="stats-container">
        <div className="stats-summary">
          <span className="stat-item">
            <strong>Total:</strong> {totalDominoes}
          </span>
          <span className="stat-item">
            <strong>Colored:</strong> {coloredCount}
          </span>
          <span className="stat-item">
            <strong>Clear:</strong> {clearCount}
          </span>
        </div>

        {sortedColors.length > 0 && (
          <div className="color-counts">
            {sortedColors.map(([color, count]) => (
              <div key={color} className="color-count-item">
                <span
                  className="color-count-swatch"
                  style={{ backgroundColor: color }}
                />
                <span className="color-count-value">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default DominoStats
