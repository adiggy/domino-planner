import { useCallback, Fragment } from 'react'

const CLEAR = 'clear'

// Base domino dimensions
const BASE_DOMINO_WIDTH = 90
const BASE_DOMINO_HEIGHT = 30
const BASE_H_GAP = 15
const BASE_V_GAP = 30

// Fill button size
const FILL_BTN_SIZE = 24

// Label column width
const LABEL_WIDTH = 30

function DominoGrid({
  grid,
  zoom,
  selection,
  onCellMouseDown,
  onCellMouseEnter,
  onFillRow,
  onFillColumn,
  onContextMenu
}) {
  const rows = grid.length
  const cols = grid[0]?.length || 0

  // Apply zoom
  const scale = zoom / 100
  const dominoWidth = BASE_DOMINO_WIDTH * scale
  const dominoHeight = BASE_DOMINO_HEIGHT * scale
  const hGap = BASE_H_GAP * scale
  const vGap = BASE_V_GAP * scale

  if (rows === 0 || cols === 0) {
    return (
      <section className="section">
        <h2 className="section-title">Domino Grid</h2>
        <p>Configure grid size above to start designing.</p>
      </section>
    )
  }

  // Check if a cell is within the selection
  const isInSelection = (row, col) => {
    if (!selection) return false
    return (
      row >= selection.startRow &&
      row <= selection.endRow &&
      col >= selection.startCol &&
      col <= selection.endCol
    )
  }

  // CSS Grid template
  // Columns: row-label | row-btn | col1 | col2 | ...
  const gridTemplateColumns = `${LABEL_WIDTH}px ${FILL_BTN_SIZE + 10}px repeat(${cols}, ${dominoWidth}px)`
  // Rows: col-labels | col-btns | row1 | row2 | ...
  const gridTemplateRows = `${LABEL_WIDTH}px ${FILL_BTN_SIZE + 10}px repeat(${rows}, ${dominoHeight}px)`

  const preventDrag = useCallback((e) => {
    e.preventDefault()
  }, [])

  return (
    <section className="section">
      <h2 className="section-title">Domino Grid</h2>
      <div className="grid-container">
        <div
          className="domino-grid"
          style={{
            gridTemplateColumns,
            gridTemplateRows,
            columnGap: `${hGap}px`,
            rowGap: `${vGap}px`
          }}
          onDragStart={preventDrag}
        >
          {/* Row 1: Corner (empty) + Corner (empty) + Column labels */}
          <div className="corner-cell" />
          <div className="corner-cell" />
          {Array.from({ length: cols }, (_, colIndex) => (
            <div key={`col-label-${colIndex}`} className="grid-label col-label">
              {colIndex + 1}
            </div>
          ))}

          {/* Row 2: Corner (empty) + Corner (empty) + Column fill buttons */}
          <div className="corner-cell" />
          <div className="corner-cell" />
          {Array.from({ length: cols }, (_, colIndex) => (
            <button
              key={`col-btn-${colIndex}`}
              className="fill-btn col-fill-btn"
              onClick={() => onFillColumn(colIndex)}
              onContextMenu={(e) => onContextMenu(e, 'column', colIndex)}
              title={`Fill column ${colIndex + 1} (right-click for options)`}
            />
          ))}

          {/* Grid rows with labels, row buttons, and cells */}
          {grid.map((row, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              {/* Row label */}
              <div className="grid-label row-label">
                {rowIndex + 1}
              </div>

              {/* Row fill button */}
              <button
                className="fill-btn row-fill-btn"
                onClick={() => onFillRow(rowIndex)}
                onContextMenu={(e) => onContextMenu(e, 'row', rowIndex)}
                title={`Fill row ${rowIndex + 1} (right-click for options)`}
              />

              {/* Domino cells */}
              {row.map((cellValue, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`domino-cell ${cellValue === CLEAR ? 'clear' : ''} ${isInSelection(rowIndex, colIndex) ? 'selected-cell' : ''}`}
                  style={cellValue !== CLEAR ? { backgroundColor: cellValue } : undefined}
                  onMouseDown={(e) => onCellMouseDown(rowIndex, colIndex, e)}
                  onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                >
                  {cellValue === CLEAR && 'C'}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DominoGrid
