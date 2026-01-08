import { useState } from 'react'

// Google Material Symbols Outlined Icons
const UndoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 19v-2h7.1q1.575 0 2.738-1.062Q18 14.875 18 13.5t-1.162-2.438Q15.675 10 14.1 10H7.8l2.6 2.6L9 14l-5-5l5-5l1.4 1.4L7.8 8h6.3q2.425 0 4.163 1.575Q20 11.15 20 13.5q0 2.35-1.737 3.925Q16.525 19 14.1 19Z"/>
  </svg>
)

const RedoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.9 19q-2.425 0-4.162-1.575Q4 15.85 4 13.5q0-2.35 1.738-3.925Q7.475 8 9.9 8h6.3l-2.6-2.6L15 4l5 5l-5 5l-1.4-1.4l2.6-2.6H9.9q-1.575 0-2.737 1.062Q6 12.125 6 13.5t1.163 2.438Q8.325 17 9.9 17H17v2Z"/>
  </svg>
)

// Fit to screen icon (Material Symbols Outlined - fit_screen)
const FitScreenIcon = () => (
  <svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M800-600v-120H680v-80h120q33 0 56.5 23.5T880-720v120h-80Zm-720 0v-120q0-33 23.5-56.5T160-800h120v80H160v120H80Zm600 440v-80h120v-120h80v120q0 33-23.5 56.5T800-160H680Zm-520 0q-33 0-56.5-23.5T80-240v-120h80v120h120v80H160Zm80-160v-320h480v320H240Zm80-80h320v-160H320v160Zm0 0v-160 160Z"/>
  </svg>
)

// Help icon (Material Symbols Outlined - help)
const HelpIcon = () => (
  <svg width="14" height="14" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
  </svg>
)

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
  onClearSelection,
  onFitScreen
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
    <section className="section toolbar-section">
      <h2 className="section-title">Grid Configuration</h2>

      <div className="toolbar-row">
        {/* Undo/Redo */}
        <div className="control-group">
          <button
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon />
          </button>
          <button
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <RedoIcon />
          </button>
        </div>

        {/* Grid Size */}
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

        {/* Zoom */}
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
          <button
            className="fit-screen-btn"
            onClick={onFitScreen}
            title="Fit to screen"
          >
            <FitScreenIcon />
          </button>
        </div>

        {/* Mirror Mode */}
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

        {/* Action Buttons */}
        <div className="control-group">
          <button className="grid-btn danger" onClick={onClearGrid}>
            Clear Grid
          </button>
          <button className="grid-btn" onClick={onSaveGrid}>
            Save Grid
          </button>
          <button className="grid-btn" onClick={onLoadGrid}>
            Load Grid
          </button>
          <div className="import-image-group">
            <button className="grid-btn" onClick={onImportImage}>
              Import Image
            </button>
            <span className="help-icon-wrapper">
              <span className="help-icon">
                <HelpIcon />
              </span>
              <span className="help-tooltip">
                Converts any image into a domino layout. Each domino becomes a pixel—colors are automatically matched to your palette based on available quantities. The grid size is optimized to maximize resolution while staying within your color limits.
              </span>
            </span>
          </div>
        </div>

        {/* Selection Tools (shown when selection exists) */}
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
      </div>
    </section>
  )
}

export default GridControls
