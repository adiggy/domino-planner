import { useState } from 'react'
import ColorWheel from './ColorWheel'

const CLEAR = 'clear'

function ColorPalette({
  palette,
  selectedColor,
  onSelectColor,
  pickerColor,
  onPickerChange,
  onAddColor,
  isDeleteMode,
  setIsDeleteMode,
  selectedForDeletion,
  onToggleForDeletion,
  onDeleteSelected,
  onCancelDelete,
  editingColor,
  onStartEditing,
  onApplyEdit,
  onFinishEditing
}) {
  const [useColorWheel, setUseColorWheel] = useState(false)

  const handleSwatchClick = (color) => {
    if (isDeleteMode) {
      onToggleForDeletion(color)
    } else if (editingColor) {
      // If in edit mode, clicking another swatch switches to editing that one
      if (color !== CLEAR && color !== editingColor) {
        onStartEditing(color)
      }
    } else {
      onSelectColor(color)
    }
  }

  const handleSwatchDoubleClick = (color) => {
    if (!isDeleteMode && color !== CLEAR) {
      onStartEditing(color)
    }
  }

  const handleColorChange = (newColor) => {
    onPickerChange(newColor)
    if (editingColor) {
      onApplyEdit(newColor)
    }
  }

  const deletableCount = palette.filter(c => c !== CLEAR).length

  return (
    <section className="section">
      <h2 className="section-title">Color Controls</h2>

      <div className="color-controls-layout">
        {/* Color selection area */}
        <div className="color-selection-area">
          <div className="picker-toggle">
            <button
              className={`toggle-btn ${!useColorWheel ? 'active' : ''}`}
              onClick={() => setUseColorWheel(false)}
            >
              Picker
            </button>
            <button
              className={`toggle-btn ${useColorWheel ? 'active' : ''}`}
              onClick={() => setUseColorWheel(true)}
            >
              Wheel
            </button>
          </div>

          {useColorWheel ? (
            <ColorWheel
              value={pickerColor}
              onChange={handleColorChange}
            />
          ) : (
            <div className="color-picker-wrapper">
              <input
                type="color"
                className="color-picker"
                value={pickerColor}
                onChange={(e) => handleColorChange(e.target.value)}
              />
            </div>
          )}

          <div className="color-actions">
            {editingColor ? (
              <>
                <div className="editing-indicator">
                  Editing: <span className="editing-color-preview" style={{ backgroundColor: editingColor }} />
                </div>
                <button className="action-btn" onClick={onFinishEditing}>
                  Done Editing
                </button>
              </>
            ) : (
              <button className="add-color-btn" onClick={onAddColor}>
                Add to palette
              </button>
            )}
          </div>
        </div>

        {/* Palette area */}
        <div className="palette-area">
          <div className="palette-header">
            <span className="palette-label">Palette</span>
            {!isDeleteMode && !editingColor && deletableCount > 0 && (
              <button
                className="delete-mode-btn"
                onClick={() => setIsDeleteMode(true)}
              >
                Select to Delete
              </button>
            )}
            {isDeleteMode && (
              <div className="delete-actions">
                <span className="delete-count">
                  {selectedForDeletion.size} selected
                </span>
                <button
                  className="action-btn danger"
                  onClick={onDeleteSelected}
                  disabled={selectedForDeletion.size === 0}
                >
                  Delete Selected
                </button>
                <button className="action-btn" onClick={onCancelDelete}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="palette-strip">
            {palette.map((color, index) => {
              const isClear = color === CLEAR
              const isSelected = selectedColor === color
              const isMarkedForDeletion = selectedForDeletion.has(color)
              const isBeingEdited = editingColor === color

              return (
                <div
                  key={index}
                  className={`palette-swatch
                    ${isClear ? 'clear-swatch' : ''}
                    ${isSelected && !isDeleteMode ? 'selected' : ''}
                    ${isMarkedForDeletion ? 'marked-for-deletion' : ''}
                    ${isBeingEdited ? 'being-edited' : ''}
                    ${isDeleteMode && isClear ? 'not-deletable' : ''}
                  `}
                  style={!isClear ? { backgroundColor: color } : undefined}
                  onClick={() => handleSwatchClick(color)}
                  onDoubleClick={() => handleSwatchDoubleClick(color)}
                  title={
                    isClear
                      ? 'Clear (cannot be deleted)'
                      : isDeleteMode
                        ? isMarkedForDeletion ? 'Click to deselect' : 'Click to select for deletion'
                        : `${color} - Double-click to edit`
                  }
                >
                  {isClear && 'C'}
                  {isMarkedForDeletion && <span className="deletion-check">✓</span>}
                </div>
              )
            })}
          </div>

          {!isDeleteMode && !editingColor && (
            <p className="palette-hint">
              Click to select for painting. Double-click to edit a color.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default ColorPalette
