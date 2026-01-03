import { useState } from 'react'

function GridControls({
  rowInput,
  colInput,
  onRowInputChange,
  onColInputChange,
  onApplySize,
  onClearGrid,
  onSaveGrid,
  onLoadGrid,
  onImportImage,
  zoom,
  onZoomChange,
  mirrorMode,
  onMirrorModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selection,
  clipboard,
  onCopy,
  onPaste,
  onFillSelection,
  onClearSelection
}) {
  const [pendingRows, setPendingRows] = useState(rowInput)
  const [pendingCols, setPendingCols] = useState(colInput)

  // Sync pending values when props change (e.g., from context menu operations)
  if (pendingRows !== rowInput && document.activeElement?.id !== 'rows') {
    setPendingRows(rowInput)
  }
  if (pendingCols !== colInput && document.activeElement?.id !== 'cols') {
    setPendingCols(colInput)
  }

  const handleRowKeyDown = (e) => {
    if (e.key === 'Enter') {
      const value = Math.max(1, parseInt(pendingRows) || 1)
      onRowInputChange(value)
      onApplySize(value, undefined) // Pass row value directly
      e.target.blur()
    }
  }

  const handleColKeyDown = (e) => {
    if (e.key === 'Enter') {
      const value = Math.max(1, parseInt(pendingCols) || 1)
      onColInputChange(value)
      onApplySize(undefined, value) // Pass col value directly
      e.target.blur()
    }
  }

  const handleRowBlur = () => {
    const value = Math.max(1, parseInt(pendingRows) || 1)
    setPendingRows(value)
    onRowInputChange(value)
    onApplySize(value, undefined) // Pass row value directly
  }

  const handleColBlur = () => {
    const value = Math.max(1, parseInt(pendingCols) || 1)
    setPendingCols(value)
    onColInputChange(value)
    onApplySize(undefined, value) // Pass col value directly
  }

  return (
    <section className="section">
      <h2 className="section-title">Grid Configuration</h2>

      {/* Row 1: Undo/Redo, Grid Size, Zoom */}
      <div className="grid-controls">
        <div className="control-group">
          <button
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>

        <div className="control-group">
          <div className="input-group">
            <label htmlFor="rows">Rows:</label>
            <input
              id="rows"
              type="number"
              min="1"
              max="100"
              value={pendingRows}
              onChange={(e) => setPendingRows(e.target.value)}
              onKeyDown={handleRowKeyDown}
              onBlur={handleRowBlur}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cols">Columns:</label>
            <input
              id="cols"
              type="number"
              min="1"
              max="100"
              value={pendingCols}
              onChange={(e) => setPendingCols(e.target.value)}
              onKeyDown={handleColKeyDown}
              onBlur={handleColBlur}
            />
          </div>
        </div>

        <div className="control-group">
          <label>Zoom:</label>
          <input
            type="range"
            min="25"
            max="200"
            value={zoom}
            onChange={(e) => onZoomChange(parseInt(e.target.value))}
            className="zoom-slider"
          />
          <span className="zoom-value">{zoom}%</span>
        </div>
      </div>

      {/* Row 2: Mirror Mode, Selection Tools */}
      <div className="grid-controls" style={{ marginTop: '12px' }}>
        <div className="control-group">
          <label>Mirror:</label>
          <select
            value={mirrorMode}
            onChange={(e) => onMirrorModeChange(e.target.value)}
            className="mirror-select"
          >
            <option value="none">None</option>
            <option value="horizontal">Horizontal ↔</option>
            <option value="vertical">Vertical ↕</option>
            <option value="both">Both ✛</option>
          </select>
        </div>

        {selection && (
          <div className="control-group selection-tools">
            <span className="selection-info">
              Selection: {selection.endRow - selection.startRow + 1}×{selection.endCol - selection.startCol + 1}
            </span>
            <button className="grid-btn small" onClick={onCopy} title="Copy (Ctrl+C)">
              Copy
            </button>
            {clipboard && (
              <button className="grid-btn small" onClick={onPaste} title="Paste (Ctrl+V)">
                Paste
              </button>
            )}
            <button className="grid-btn small primary" onClick={onFillSelection}>
              Fill
            </button>
            <button className="grid-btn small" onClick={onClearSelection}>
              Deselect
            </button>
          </div>
        )}

        {!selection && (
          <span className="hint-text">Shift+drag to select region</span>
        )}
      </div>

      {/* Row 3: Action Buttons */}
      <div className="grid-controls" style={{ marginTop: '12px' }}>
        <button className="grid-btn danger" onClick={onClearGrid}>
          Clear Grid
        </button>

        <button className="grid-btn" onClick={onSaveGrid}>
          Save Grid
        </button>

        <button className="grid-btn" onClick={onLoadGrid}>
          Load Grid
        </button>

        <button className="grid-btn" onClick={onImportImage}>
          Import Image
        </button>
      </div>
    </section>
  )
}

export default GridControls
