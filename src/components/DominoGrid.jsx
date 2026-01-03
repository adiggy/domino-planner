import { useCallback, Fragment } from 'react'

const CLEAR = 'clear'
const DISNEY = 'disney'

// Base domino dimensions
const BASE_DOMINO_WIDTH = 90
const BASE_DOMINO_HEIGHT = 30
const BASE_H_GAP = 15
const BASE_V_GAP = 30

// Base fill button size
const BASE_FILL_BTN_SIZE = 24

// Base label column width
const BASE_LABEL_WIDTH = 30

function DominoGrid({
  grid,
  zoom,
  palette,
  selection,
  dragPreview,
  isDraggingSelection,
  duplicatePreview,
  isDuplicateDragging,
  onCellMouseDown,
  onCellMouseEnter,
  onCellContextMenu,
  onFillRow,
  onFillColumn,
  onContextMenu
}) {
  const rows = grid.length
  const cols = grid[0]?.length || 0

  // Create a map for quick color name lookup
  const colorNameMap = {}
  if (palette) {
    palette.forEach(p => {
      colorNameMap[p.hex] = p.name
    })
  }

  // Apply zoom
  const scale = zoom / 100
  const dominoWidth = BASE_DOMINO_WIDTH * scale
  const dominoHeight = BASE_DOMINO_HEIGHT * scale
  const hGap = BASE_H_GAP * scale
  const vGap = BASE_V_GAP * scale
  const fillBtnSize = BASE_FILL_BTN_SIZE * scale
  const labelWidth = BASE_LABEL_WIDTH * scale

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

  // Check if a cell is within the drag preview
  const isInDragPreview = (row, col) => {
    if (!dragPreview) return false
    return (
      row >= dragPreview.startRow &&
      row <= dragPreview.endRow &&
      col >= dragPreview.startCol &&
      col <= dragPreview.endCol
    )
  }

  // Check if a cell is within the duplicate preview
  const isInDuplicatePreview = (row, col) => {
    if (!duplicatePreview) return false
    return (
      row >= duplicatePreview.startRow &&
      row <= duplicatePreview.endRow &&
      col >= duplicatePreview.startCol &&
      col <= duplicatePreview.endCol
    )
  }

  // Get the color that would appear at a position if dragged
  const getDragPreviewColor = (row, col) => {
    if (!dragPreview || !selection) return null
    const offsetRow = row - dragPreview.startRow
    const offsetCol = col - dragPreview.startCol
    const sourceRow = selection.startRow + offsetRow
    const sourceCol = selection.startCol + offsetCol
    if (sourceRow >= 0 && sourceRow < grid.length && sourceCol >= 0 && sourceCol < grid[0].length) {
      return grid[sourceRow][sourceCol]
    }
    return null
  }

  // CSS Grid template
  // Columns: row-label | row-btn | col1 | col2 | ...
  const gridTemplateColumns = `${labelWidth}px ${fillBtnSize + 10 * scale}px repeat(${cols}, ${dominoWidth}px)`
  // Rows: col-labels | col-btns | row1 | row2 | ...
  const gridTemplateRows = `${labelWidth}px ${fillBtnSize + 10 * scale}px repeat(${rows}, ${dominoHeight}px)`

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
            <div
              key={`col-label-${colIndex}`}
              className="grid-label col-label"
              style={{ fontSize: `${11 * scale}px` }}
            >
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
              style={{ width: `${fillBtnSize}px`, height: `${fillBtnSize}px` }}
              onClick={() => onFillColumn(colIndex)}
              onContextMenu={(e) => onContextMenu(e, 'column', colIndex)}
              title={`Fill column ${colIndex + 1} (right-click for options)`}
            />
          ))}

          {/* Grid rows with labels, row buttons, and cells */}
          {grid.map((row, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              {/* Row label */}
              <div className="grid-label row-label" style={{ fontSize: `${11 * scale}px` }}>
                {rowIndex + 1}
              </div>

              {/* Row fill button */}
              <button
                className="fill-btn row-fill-btn"
                style={{ width: `${fillBtnSize}px`, height: `${fillBtnSize}px` }}
                onClick={() => onFillRow(rowIndex)}
                onContextMenu={(e) => onContextMenu(e, 'row', rowIndex)}
                title={`Fill row ${rowIndex + 1} (right-click for options)`}
              />

              {/* Domino cells */}
              {row.map((cellValue, colIndex) => {
                const isClear = cellValue === CLEAR
                const isDisney = cellValue === DISNEY
                const isSpecial = isClear || isDisney

                const inSelection = isInSelection(rowIndex, colIndex)
                const inDragPreview = isInDragPreview(rowIndex, colIndex)
                const inDuplicatePreview = isInDuplicatePreview(rowIndex, colIndex)
                const previewColor = getDragPreviewColor(rowIndex, colIndex)

                let cellStyle = {}
                if (isClear) {
                  cellStyle = { fontSize: `${14 * scale}px` }
                } else if (isDisney) {
                  cellStyle = { fontSize: `${14 * scale}px` }
                } else {
                  cellStyle = { backgroundColor: cellValue }
                }

                // Add grab cursor for selected cells
                if (inSelection && !isDraggingSelection && !isDuplicateDragging) {
                  cellStyle.cursor = 'grab'
                } else if (isDraggingSelection) {
                  cellStyle.cursor = 'grabbing'
                } else if (isDuplicateDragging) {
                  cellStyle.cursor = 'copy'
                }

                // Get color name for tooltip
                const colorName = isClear ? 'Clear' : isDisney ? 'Disney' : (colorNameMap[cellValue] || cellValue)

                // Build class list
                const classNames = [
                  'domino-cell',
                  isClear ? 'clear' : '',
                  isDisney ? 'disney' : '',
                  inSelection ? 'selected-cell' : '',
                  isDraggingSelection && inSelection ? 'dragging-source' : '',
                  inDragPreview ? 'drag-preview' : '',
                  inDuplicatePreview ? 'duplicate-preview' : ''
                ].filter(Boolean).join(' ')

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={classNames}
                    style={cellStyle}
                    onMouseDown={(e) => onCellMouseDown(rowIndex, colIndex, e)}
                    onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                    onContextMenu={(e) => onCellContextMenu && onCellContextMenu(e, rowIndex, colIndex)}
                    title={colorName}
                  >
                    {isClear && 'C'}
                    {isDisney && 'D'}
                    {/* Drag preview overlay */}
                    {inDragPreview && previewColor && (
                      <div
                        className={`drag-preview-overlay ${previewColor === CLEAR ? 'clear' : ''} ${previewColor === DISNEY ? 'disney' : ''}`}
                        style={previewColor !== CLEAR && previewColor !== DISNEY ? { backgroundColor: previewColor } : undefined}
                      >
                        {previewColor === CLEAR && 'C'}
                        {previewColor === DISNEY && 'D'}
                      </div>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DominoGrid
