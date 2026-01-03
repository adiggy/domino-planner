function SelectionContextMenu({
  x,
  y,
  selection,
  onDeleteRows,
  onDeleteColumns,
  onClearSection,
  onClose,
  gridRows,
  gridCols
}) {
  if (!selection) return null

  const rowCount = selection.endRow - selection.startRow + 1
  const colCount = selection.endCol - selection.startCol + 1

  // Can only delete if we'd have at least 1 row/column remaining
  const canDeleteRows = gridRows - rowCount >= 1
  const canDeleteCols = gridCols - colCount >= 1

  // Prevent menu from going off-screen
  const menuStyle = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 240),
    top: Math.min(y, window.innerHeight - 250),
    zIndex: 1000
  }

  return (
    <div
      className="context-menu selection-context-menu"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-header">
        Selection: {colCount} col{colCount > 1 ? 's' : ''} × {rowCount} row{rowCount > 1 ? 's' : ''}
      </div>

      {/* Clear section */}
      <div className="context-menu-item-group">
        <button
          className="context-menu-item"
          onClick={() => {
            onClearSection()
            onClose()
          }}
        >
          Clear section
        </button>
      </div>

      <div className="context-menu-divider" />

      {/* Delete operations */}
      <div className="context-menu-item-group">
        <button
          className="context-menu-item danger"
          onClick={() => {
            onDeleteRows(selection.startRow, rowCount)
            onClose()
          }}
          disabled={!canDeleteRows}
          title={!canDeleteRows ? 'Cannot delete all rows' : ''}
        >
          Delete {rowCount} row{rowCount > 1 ? 's' : ''}
        </button>
        <button
          className="context-menu-item danger"
          onClick={() => {
            onDeleteColumns(selection.startCol, colCount)
            onClose()
          }}
          disabled={!canDeleteCols}
          title={!canDeleteCols ? 'Cannot delete all columns' : ''}
        >
          Delete {colCount} column{colCount > 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

export default SelectionContextMenu
