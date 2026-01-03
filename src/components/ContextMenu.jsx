import { useState } from 'react'

function ContextMenu({
  x,
  y,
  type, // 'row' or 'column'
  index,
  onAddRows,
  onAddColumns,
  onDeleteRow,
  onDeleteColumn,
  onDeleteRows,
  onDeleteColumns,
  onClose,
  canDelete,
  maxDelete // maximum rows/columns that can be deleted
}) {
  const [showCountInput, setShowCountInput] = useState(null) // 'above', 'below', 'left', 'right', 'delete'
  const [count, setCount] = useState(1)
  const [deleteCount, setDeleteCount] = useState(1)

  const handleAddWithCount = (position) => {
    if (type === 'row') {
      onAddRows(index, position, count)
    } else {
      onAddColumns(index, position, count)
    }
    setShowCountInput(null)
    setCount(1)
  }

  const handleDeleteWithCount = () => {
    if (type === 'row') {
      onDeleteRows(index, deleteCount)
    } else {
      onDeleteColumns(index, deleteCount)
    }
    onClose()
  }

  const handleKeyDown = (e, position) => {
    if (e.key === 'Enter') {
      if (position === 'delete') {
        handleDeleteWithCount()
      } else {
        handleAddWithCount(position)
      }
    }
    if (e.key === 'Escape') {
      setShowCountInput(null)
      setCount(1)
      setDeleteCount(1)
    }
  }

  // Prevent menu from going off-screen
  const menuStyle = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 200),
    zIndex: 1000
  }

  const isRow = type === 'row'
  const label = isRow ? 'Row' : 'Column'

  return (
    <div
      className="context-menu"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-header">
        {label} {index + 1}
      </div>

      {/* Add Above/Left */}
      <div className="context-menu-item-group">
        {showCountInput === (isRow ? 'above' : 'left') ? (
          <div className="context-menu-input-row">
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={(e) => handleKeyDown(e, isRow ? 'above' : 'left')}
              autoFocus
              className="context-menu-input"
            />
            <button
              className="context-menu-confirm"
              onClick={() => handleAddWithCount(isRow ? 'above' : 'left')}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            className="context-menu-item"
            onClick={() => isRow ? onAddRows(index, 'above', 1) : onAddColumns(index, 'left', 1)}
          >
            Add {isRow ? 'Row Above' : 'Column Left'}
            <span
              className="context-menu-expand"
              onClick={(e) => {
                e.stopPropagation()
                setShowCountInput(isRow ? 'above' : 'left')
              }}
              title="Add multiple"
            >
              +#
            </span>
          </button>
        )}
      </div>

      {/* Add Below/Right */}
      <div className="context-menu-item-group">
        {showCountInput === (isRow ? 'below' : 'right') ? (
          <div className="context-menu-input-row">
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={(e) => handleKeyDown(e, isRow ? 'below' : 'right')}
              autoFocus
              className="context-menu-input"
            />
            <button
              className="context-menu-confirm"
              onClick={() => handleAddWithCount(isRow ? 'below' : 'right')}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            className="context-menu-item"
            onClick={() => isRow ? onAddRows(index, 'below', 1) : onAddColumns(index, 'right', 1)}
          >
            Add {isRow ? 'Row Below' : 'Column Right'}
            <span
              className="context-menu-expand"
              onClick={(e) => {
                e.stopPropagation()
                setShowCountInput(isRow ? 'below' : 'right')
              }}
              title="Add multiple"
            >
              +#
            </span>
          </button>
        )}
      </div>

      <div className="context-menu-divider" />

      {/* Delete */}
      <div className="context-menu-item-group">
        {showCountInput === 'delete' ? (
          <div className="context-menu-input-row">
            <input
              type="number"
              min="1"
              max={maxDelete || 50}
              value={deleteCount}
              onChange={(e) => setDeleteCount(Math.max(1, Math.min(maxDelete || 50, parseInt(e.target.value) || 1)))}
              onKeyDown={(e) => handleKeyDown(e, 'delete')}
              autoFocus
              className="context-menu-input"
            />
            <button
              className="context-menu-confirm danger"
              onClick={handleDeleteWithCount}
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            className="context-menu-item danger"
            onClick={() => isRow ? onDeleteRow(index) : onDeleteColumn(index)}
            disabled={!canDelete}
          >
            Delete {label}
            {canDelete && maxDelete > 1 && (
              <span
                className="context-menu-expand danger"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCountInput('delete')
                  setDeleteCount(1)
                }}
                title="Delete multiple"
              >
                -#
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default ContextMenu
