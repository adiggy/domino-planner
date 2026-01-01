import { useState, useRef, useCallback, useEffect } from 'react'
import ColorPalette from './components/ColorPalette'
import GridControls from './components/GridControls'
import DominoGrid from './components/DominoGrid'
import DominoStats from './components/DominoStats'
import ContextMenu from './components/ContextMenu'

// Cell state: 'clear' for clear state, or a hex color string
const CLEAR = 'clear'

function createEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => CLEAR)
  )
}

// Deep clone grid
function cloneGrid(grid) {
  return grid.map(row => [...row])
}

// Max history size
const MAX_HISTORY = 50

function App() {
  // Grid dimensions (pending values in inputs)
  const [rowInput, setRowInput] = useState(5)
  const [colInput, setColInput] = useState(8)

  // Grid state: 2D array of cell values ('clear' or hex color)
  const [grid, setGrid] = useState(() => createEmptyGrid(5, 8))

  // History for undo/redo
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedo = useRef(false)

  // Palette: array of colors, 'clear' is always first
  const [palette, setPalette] = useState([CLEAR])

  // Currently selected color from palette (for painting)
  const [selectedColor, setSelectedColor] = useState(CLEAR)

  // Color picker value
  const [pickerColor, setPickerColor] = useState('#ff0000')

  // Multi-select mode for deletion
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set())
  const [isDeleteMode, setIsDeleteMode] = useState(false)

  // Edit mode - which color is being edited
  const [editingColor, setEditingColor] = useState(null)

  // Zoom level (percentage)
  const [zoom, setZoom] = useState(100)

  // Mirror mode: 'none', 'horizontal', 'vertical', 'both'
  const [mirrorMode, setMirrorMode] = useState('none')

  // Selection state
  const [selection, setSelection] = useState(null) // { startRow, startCol, endRow, endCol }
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null)

  // Drag painting state
  const isPainting = useRef(false)

  // File input refs
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  // Save state to history
  const saveToHistory = useCallback((newGrid) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false
      return
    }
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(cloneGrid(newGrid))
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true
      setHistoryIndex(prev => prev - 1)
      setGrid(cloneGrid(history[historyIndex - 1]))
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true
      setHistoryIndex(prev => prev + 1)
      setGrid(cloneGrid(history[historyIndex + 1]))
    }
  }, [history, historyIndex])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      // Copy/Paste shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selection) {
        e.preventDefault()
        copySelection()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        pasteClipboard()
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelection(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selection, clipboard])

  // Initialize history with first grid state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([cloneGrid(grid)])
      setHistoryIndex(0)
    }
  }, [])

  // Apply row/column input changes
  const applyGridSize = useCallback(() => {
    const newRows = Math.max(1, rowInput)
    const newCols = Math.max(1, colInput)
    const currentRows = grid.length
    const currentCols = grid[0]?.length || 0

    if (newRows === currentRows && newCols === currentCols) return

    setGrid(prev => {
      const newGrid = []
      for (let r = 0; r < newRows; r++) {
        const row = []
        for (let c = 0; c < newCols; c++) {
          row.push(prev[r]?.[c] ?? CLEAR)
        }
        newGrid.push(row)
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [rowInput, colInput, grid, saveToHistory])

  // Clear the entire grid (set all cells to Clear)
  const clearGrid = useCallback(() => {
    const newGrid = grid.map(row => row.map(() => CLEAR))
    saveToHistory(newGrid)
    setGrid(newGrid)
  }, [grid, saveToHistory])

  // Add color to palette
  const addColorToPalette = useCallback(() => {
    const normalized = pickerColor.toLowerCase()
    if (!palette.includes(normalized)) {
      setPalette(prev => [...prev, normalized])
    }
    setSelectedColor(normalized)
    setEditingColor(null)
  }, [pickerColor, palette])

  // Toggle swatch selection for deletion
  const toggleSwatchForDeletion = useCallback((color) => {
    if (color === CLEAR) return
    setSelectedForDeletion(prev => {
      const next = new Set(prev)
      if (next.has(color)) {
        next.delete(color)
      } else {
        next.add(color)
      }
      return next
    })
  }, [])

  // Delete selected swatches
  const deleteSelectedSwatches = useCallback(() => {
    setPalette(prev => prev.filter(c => !selectedForDeletion.has(c)))
    if (selectedForDeletion.has(selectedColor)) {
      setSelectedColor(CLEAR)
    }
    setSelectedForDeletion(new Set())
    setIsDeleteMode(false)
  }, [selectedForDeletion, selectedColor])

  // Cancel delete mode
  const cancelDeleteMode = useCallback(() => {
    setSelectedForDeletion(new Set())
    setIsDeleteMode(false)
  }, [])

  // Start editing a color
  const startEditingColor = useCallback((color) => {
    if (color === CLEAR) return
    setEditingColor(color)
    setPickerColor(color)
  }, [])

  // Apply color edit
  const applyColorEdit = useCallback((newColor) => {
    if (!editingColor || editingColor === CLEAR) return
    const normalized = newColor.toLowerCase()

    setPalette(prev => prev.map(c => c === editingColor ? normalized : c))

    const newGrid = grid.map(row =>
      row.map(cell => cell === editingColor ? normalized : cell)
    )
    setGrid(newGrid)
    saveToHistory(newGrid)

    if (selectedColor === editingColor) {
      setSelectedColor(normalized)
    }

    setEditingColor(normalized)
  }, [editingColor, selectedColor, grid, saveToHistory])

  // Finish editing
  const finishEditing = useCallback(() => {
    setEditingColor(null)
  }, [])

  // Get mirrored positions
  const getMirroredPositions = useCallback((row, col) => {
    const positions = [[row, col]]
    const rows = grid.length
    const cols = grid[0]?.length || 0

    if (mirrorMode === 'horizontal' || mirrorMode === 'both') {
      positions.push([row, cols - 1 - col])
    }
    if (mirrorMode === 'vertical' || mirrorMode === 'both') {
      positions.push([rows - 1 - row, col])
    }
    if (mirrorMode === 'both') {
      positions.push([rows - 1 - row, cols - 1 - col])
    }

    return positions
  }, [grid, mirrorMode])

  // Paint a single cell (with mirror support)
  const paintCell = useCallback((row, col) => {
    const positions = getMirroredPositions(row, col)
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      positions.forEach(([r, c]) => {
        if (r >= 0 && r < newGrid.length && c >= 0 && c < newGrid[0].length) {
          newGrid[r][c] = selectedColor
        }
      })
      return newGrid
    })
  }, [selectedColor, getMirroredPositions])

  // Fill entire row
  const fillRow = useCallback((row) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      for (let col = 0; col < newGrid[row].length; col++) {
        newGrid[row][col] = selectedColor
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [selectedColor, saveToHistory])

  // Fill entire column
  const fillColumn = useCallback((col) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      for (let row = 0; row < newGrid.length; row++) {
        newGrid[row][col] = selectedColor
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [selectedColor, saveToHistory])

  // Selection handlers
  const handleSelectionStart = useCallback((row, col) => {
    setIsSelecting(true)
    setSelectionStart({ row, col })
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col })
  }, [])

  const handleSelectionMove = useCallback((row, col) => {
    if (isSelecting && selectionStart) {
      setSelection({
        startRow: Math.min(selectionStart.row, row),
        startCol: Math.min(selectionStart.col, col),
        endRow: Math.max(selectionStart.row, row),
        endCol: Math.max(selectionStart.col, col)
      })
    }
  }, [isSelecting, selectionStart])

  const handleSelectionEnd = useCallback(() => {
    setIsSelecting(false)
  }, [])

  // Copy selection to clipboard
  const copySelection = useCallback(() => {
    if (!selection) return
    const { startRow, startCol, endRow, endCol } = selection
    const copied = []
    for (let r = startRow; r <= endRow; r++) {
      const row = []
      for (let c = startCol; c <= endCol; c++) {
        row.push(grid[r][c])
      }
      copied.push(row)
    }
    setClipboard(copied)
  }, [selection, grid])

  // Paste clipboard at selection start
  const pasteClipboard = useCallback(() => {
    if (!clipboard || !selection) return
    const { startRow, startCol } = selection
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      for (let r = 0; r < clipboard.length; r++) {
        for (let c = 0; c < clipboard[r].length; c++) {
          const targetR = startRow + r
          const targetC = startCol + c
          if (targetR < newGrid.length && targetC < newGrid[0].length) {
            newGrid[targetR][targetC] = clipboard[r][c]
          }
        }
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [clipboard, selection, saveToHistory])

  // Fill selection with current color
  const fillSelection = useCallback(() => {
    if (!selection) return
    const { startRow, startCol, endRow, endCol } = selection
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newGrid[r][c] = selectedColor
        }
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [selection, selectedColor, saveToHistory])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  // Drag painting handlers
  const handleMouseDown = useCallback((row, col, e) => {
    if (e.shiftKey) {
      // Shift+click for selection
      handleSelectionStart(row, col)
    } else {
      isPainting.current = true
      paintCell(row, col)
    }
  }, [paintCell, handleSelectionStart])

  const handleMouseEnter = useCallback((row, col) => {
    if (isPainting.current) {
      paintCell(row, col)
    }
    if (isSelecting) {
      handleSelectionMove(row, col)
    }
  }, [paintCell, isSelecting, handleSelectionMove])

  const handleMouseUp = useCallback(() => {
    if (isPainting.current) {
      // Save to history after painting session ends
      saveToHistory(grid)
    }
    isPainting.current = false
    handleSelectionEnd()
  }, [grid, saveToHistory, handleSelectionEnd])

  // Context menu handlers
  const handleContextMenu = useCallback((e, type, index) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type, // 'row' or 'column'
      index
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Row/Column operations
  const addRows = useCallback((index, position, count = 1) => {
    setGrid(prev => {
      const newGrid = [...prev]
      const cols = prev[0]?.length || 0
      const insertIndex = position === 'above' ? index : index + 1
      for (let i = 0; i < count; i++) {
        newGrid.splice(insertIndex, 0, Array(cols).fill(CLEAR))
      }
      setRowInput(newGrid.length)
      saveToHistory(newGrid)
      return newGrid
    })
    closeContextMenu()
  }, [saveToHistory, closeContextMenu])

  const addColumns = useCallback((index, position, count = 1) => {
    setGrid(prev => {
      const insertIndex = position === 'left' ? index : index + 1
      const newGrid = prev.map(row => {
        const newRow = [...row]
        for (let i = 0; i < count; i++) {
          newRow.splice(insertIndex, 0, CLEAR)
        }
        return newRow
      })
      setColInput(newGrid[0]?.length || 0)
      saveToHistory(newGrid)
      return newGrid
    })
    closeContextMenu()
  }, [saveToHistory, closeContextMenu])

  const deleteRow = useCallback((index) => {
    if (grid.length <= 1) return
    setGrid(prev => {
      const newGrid = prev.filter((_, i) => i !== index)
      setRowInput(newGrid.length)
      saveToHistory(newGrid)
      return newGrid
    })
    closeContextMenu()
  }, [grid.length, saveToHistory, closeContextMenu])

  const deleteColumn = useCallback((index) => {
    if ((grid[0]?.length || 0) <= 1) return
    setGrid(prev => {
      const newGrid = prev.map(row => row.filter((_, i) => i !== index))
      setColInput(newGrid[0]?.length || 0)
      saveToHistory(newGrid)
      return newGrid
    })
    closeContextMenu()
  }, [grid, saveToHistory, closeContextMenu])

  // Save grid to JSON file
  const saveGrid = useCallback(() => {
    const data = {
      rows: grid.length,
      columns: grid[0]?.length || 0,
      cells: grid,
      palette: palette
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'domino-layout.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [grid, palette])

  // Load grid from JSON file
  const loadGrid = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileLoad = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.rows && data.columns && data.cells) {
          setRowInput(data.rows)
          setColInput(data.columns)
          setGrid(data.cells)
          saveToHistory(data.cells)
          if (data.palette && Array.isArray(data.palette)) {
            const paletteWithClear = data.palette.includes(CLEAR)
              ? data.palette
              : [CLEAR, ...data.palette]
            setPalette(paletteWithClear)
          }
        }
      } catch (err) {
        console.error('Failed to load grid:', err)
        alert('Failed to load grid file. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [saveToHistory])

  // Import from image
  const importFromImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageImport = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        // Create canvas to read pixels
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Use current grid dimensions or scale down if image is large
        const targetRows = grid.length
        const targetCols = grid[0]?.length || 8

        canvas.width = targetCols
        canvas.height = targetRows

        // Draw scaled image
        ctx.drawImage(img, 0, 0, targetCols, targetRows)

        // Read pixel data
        const imageData = ctx.getImageData(0, 0, targetCols, targetRows)
        const pixels = imageData.data

        const newGrid = []
        const colorsFound = new Set()

        for (let r = 0; r < targetRows; r++) {
          const row = []
          for (let c = 0; c < targetCols; c++) {
            const idx = (r * targetCols + c) * 4
            const red = pixels[idx]
            const green = pixels[idx + 1]
            const blue = pixels[idx + 2]
            const alpha = pixels[idx + 3]

            if (alpha < 128) {
              row.push(CLEAR)
            } else {
              const hex = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
              row.push(hex)
              colorsFound.add(hex)
            }
          }
          newGrid.push(row)
        }

        setGrid(newGrid)
        saveToHistory(newGrid)

        // Add found colors to palette
        setPalette(prev => {
          const newPalette = [...prev]
          colorsFound.forEach(color => {
            if (!newPalette.includes(color)) {
              newPalette.push(color)
            }
          })
          return newPalette
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }, [grid, saveToHistory])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu, closeContextMenu])

  return (
    <div
      className="app"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <h1 className="app-title">Domino Planner</h1>

      <ColorPalette
        palette={palette}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
        pickerColor={pickerColor}
        onPickerChange={setPickerColor}
        onAddColor={addColorToPalette}
        isDeleteMode={isDeleteMode}
        setIsDeleteMode={setIsDeleteMode}
        selectedForDeletion={selectedForDeletion}
        onToggleForDeletion={toggleSwatchForDeletion}
        onDeleteSelected={deleteSelectedSwatches}
        onCancelDelete={cancelDeleteMode}
        editingColor={editingColor}
        onStartEditing={startEditingColor}
        onApplyEdit={applyColorEdit}
        onFinishEditing={finishEditing}
      />

      <GridControls
        rowInput={rowInput}
        colInput={colInput}
        onRowInputChange={setRowInput}
        onColInputChange={setColInput}
        onApplySize={applyGridSize}
        onClearGrid={clearGrid}
        onSaveGrid={saveGrid}
        onLoadGrid={loadGrid}
        onImportImage={importFromImage}
        zoom={zoom}
        onZoomChange={setZoom}
        mirrorMode={mirrorMode}
        onMirrorModeChange={setMirrorMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        selection={selection}
        clipboard={clipboard}
        onCopy={copySelection}
        onPaste={pasteClipboard}
        onFillSelection={fillSelection}
        onClearSelection={clearSelection}
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden-input"
        accept=".json"
        onChange={handleFileLoad}
      />

      <input
        type="file"
        ref={imageInputRef}
        className="hidden-input"
        accept="image/*"
        onChange={handleImageImport}
      />

      <DominoStats grid={grid} palette={palette} />

      <DominoGrid
        grid={grid}
        zoom={zoom}
        selection={selection}
        onCellMouseDown={handleMouseDown}
        onCellMouseEnter={handleMouseEnter}
        onFillRow={fillRow}
        onFillColumn={fillColumn}
        onContextMenu={handleContextMenu}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          index={contextMenu.index}
          onAddRows={addRows}
          onAddColumns={addColumns}
          onDeleteRow={deleteRow}
          onDeleteColumn={deleteColumn}
          onClose={closeContextMenu}
          canDelete={
            contextMenu.type === 'row'
              ? grid.length > 1
              : (grid[0]?.length || 0) > 1
          }
        />
      )}
    </div>
  )
}

export default App
