import { useState, useEffect } from 'react'

const CLEAR = 'clear'
const DISNEY = 'disney'

function ColorPalette({
  palette,
  selectedColor,
  onSelectColor,
  onReplaceColor,
  selection,
  grid
}) {
  const hasSelection = selection !== null
  const [replaceMenu, setReplaceMenu] = useState(null)

  // Calculate which colors are in the current selection
  const colorsInSelection = new Set()
  if (hasSelection && grid) {
    const { startRow, startCol, endRow, endCol } = selection
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (grid[r] && grid[r][c]) {
          colorsInSelection.add(grid[r][c])
        }
      }
    }
  }

  const handleSwatchClick = (colorHex) => {
    onSelectColor(colorHex)
  }

  const handleContextMenu = (e, colorHex, colorName) => {
    e.preventDefault()
    setReplaceMenu({
      x: e.clientX,
      y: e.clientY,
      sourceColor: colorHex,
      sourceName: colorName
    })
  }

  const handleReplaceWith = (targetColor) => {
    if (replaceMenu && onReplaceColor) {
      onReplaceColor(replaceMenu.sourceColor, targetColor, selection)
    }
    setReplaceMenu(null)
  }

  // Close menu on click outside
  useEffect(() => {
    if (replaceMenu) {
      const handleClick = () => setReplaceMenu(null)
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [replaceMenu])

  return (
    <section className="section">
      <h2 className="section-title">Color Palette</h2>

      <div className="palette-container">
        <div className="palette-strip">
          {palette.map((paletteItem, index) => {
            const colorHex = paletteItem.hex
            const isClear = colorHex === CLEAR
            const isDisney = colorHex === DISNEY
            const isWhite = colorHex.toLowerCase() === '#ffffff'
            const isSpecial = isClear || isDisney
            const isSelected = selectedColor === colorHex
            const isInSelection = colorsInSelection.has(colorHex)

            return (
              <div
                key={index}
                className={`palette-swatch
                  ${isClear ? 'clear-swatch' : ''}
                  ${isDisney ? 'disney-swatch' : ''}
                  ${isWhite ? 'white-swatch' : ''}
                  ${isSelected ? 'selected' : ''}
                  ${isInSelection ? 'in-selection' : ''}
                `}
                style={!isSpecial ? { backgroundColor: colorHex } : undefined}
                onClick={() => handleSwatchClick(colorHex)}
                onContextMenu={(e) => handleContextMenu(e, colorHex, paletteItem.name || colorHex)}
                title={
                  paletteItem.name
                    ? `${paletteItem.name} - Qty: ${paletteItem.quantity === Infinity ? '∞' : paletteItem.quantity}\nRight-click to replace${hasSelection ? ' in selection' : ' all'}`
                    : `${colorHex}\nRight-click to replace${hasSelection ? ' in selection' : ' all'}`
                }
              >
                {isClear && 'C'}
                {isDisney && 'D'}
              </div>
            )
          })}
        </div>

        <p className="palette-hint">
          Click to select. Right-click to replace all instances.
        </p>
      </div>

      {/* Color replacement context menu */}
      {replaceMenu && (
        <div
          className="color-replace-menu"
          style={{ left: replaceMenu.x, top: replaceMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="color-replace-header">
            Replace all "{replaceMenu.sourceName}"{hasSelection ? ' in selection' : ''} with:
          </div>
          <div className="color-replace-options">
            {palette
              .filter(p => p.hex !== replaceMenu.sourceColor)
              .map((p, i) => {
                const isClear = p.hex === CLEAR
                const isDisney = p.hex === DISNEY
                const isSpecial = isClear || isDisney
                return (
                  <div
                    key={i}
                    className={`color-replace-option ${isClear ? 'clear-swatch' : ''} ${isDisney ? 'disney-swatch' : ''}`}
                    style={!isSpecial ? { backgroundColor: p.hex } : undefined}
                    onClick={() => handleReplaceWith(p.hex)}
                    title={p.name || p.hex}
                  >
                    {isClear && 'C'}
                    {isDisney && 'D'}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </section>
  )
}

export default ColorPalette
