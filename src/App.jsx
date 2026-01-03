import { useState, useRef, useCallback, useEffect } from 'react'
import ColorPalette from './components/ColorPalette'
import GridControls from './components/GridControls'
import DominoGrid from './components/DominoGrid'
import DominoStats from './components/DominoStats'
import ContextMenu from './components/ContextMenu'
import SelectionContextMenu from './components/SelectionContextMenu'
import FillColorPopup from './components/FillColorPopup'
import { rgbToHex, distributeColorsEvenly, normalizePalette, getHue } from './utils/colorUtils'

// Cell state: 'clear' for clear state, or a hex color string
const CLEAR = 'clear'
const DISNEY = 'disney'

// Default palette - Indra's domino colors sorted by hue (rainbow order)
const DEFAULT_PALETTE = [
  // Special colors first
  { hex: CLEAR, quantity: 102, name: 'Clear' },
  { hex: DISNEY, quantity: 10, name: 'Disney' },
  // Rainbow order: Red -> Orange -> Yellow -> Green -> Teal -> Blue -> Purple -> Pink
  // Neutrals at the end
  { hex: '#a6271c', quantity: 50, name: 'Red' },
  { hex: '#f98728', quantity: 50, name: 'Orange' },
  { hex: '#fed82f', quantity: 100, name: 'Yellow Orange' },
  { hex: '#fef064', quantity: 50, name: 'Yellow' },
  { hex: '#a1d170', quantity: 25, name: 'Neon Green' },
  { hex: '#4fac3c', quantity: 50, name: 'Light Green' },
  { hex: '#31694d', quantity: 50, name: 'Dark Green' },
  { hex: '#5db5bb', quantity: 100, name: 'Teal' },
  { hex: '#92bfdb', quantity: 50, name: 'Sky Blue' },
  { hex: '#3e8acc', quantity: 25, name: 'Aqua Blue' },
  { hex: '#1d55b1', quantity: 125, name: 'Medium Blue' },
  { hex: '#193582', quantity: 50, name: 'Dark Blue' },
  { hex: '#26224e', quantity: 50, name: 'Purple' },
  { hex: '#7c6ca6', quantity: 25, name: 'Lavender' },
  { hex: '#824555', quantity: 25, name: 'Magenta' },
  { hex: '#c66488', quantity: 50, name: 'Pink' },
  { hex: '#d399a7', quantity: 100, name: 'Light Pink' },
  // Neutrals
  { hex: '#ffffff', quantity: 125, name: 'White' },
  { hex: '#8b9086', quantity: 90, name: 'Gray' },
  { hex: '#000000', quantity: 50, name: 'Black' },
]

// Calculate total available dominoes for recommendations
const getTotalAvailableDominoes = (palette) => {
  return palette.reduce((sum, color) => {
    if (color.hex === CLEAR || color.hex === DISNEY) return sum
    return sum + (color.quantity === Infinity ? 0 : color.quantity)
  }, 0)
}

// Recommend grid size based on available dominoes and aspect ratio
// aspectRatio is width/height (cols/rows)
const getRecommendedGridSize = (palette, aspectRatio = 4/3, usagePercent = 0.85) => {
  const total = getTotalAvailableDominoes(palette)
  // Aim to use specified percentage of available dominoes
  const targetCells = Math.floor(total * usagePercent)

  // Calculate dimensions based on aspect ratio (width:height = cols:rows)
  // cols/rows = aspectRatio, so cols = rows * aspectRatio
  // rows * cols = targetCells
  // rows * (rows * aspectRatio) = targetCells
  // rows² = targetCells / aspectRatio
  const rows = Math.floor(Math.sqrt(targetCells / aspectRatio))
  const cols = Math.floor(rows * aspectRatio)

  return { rows, cols, totalCells: rows * cols, availableDominoes: total }
}

// Get optimal grid size for an image while preserving aspect ratio
const getOptimalGridForImage = (imageWidth, imageHeight, palette) => {
  const total = getTotalAvailableDominoes(palette)
  const imageAspectRatio = imageWidth / imageHeight // width/height

  // Calculate dimensions that preserve aspect ratio and use ~85% of dominoes
  const targetCells = Math.floor(total * 0.85)

  // rows * cols = targetCells
  // cols = rows * aspectRatio
  // rows * rows * aspectRatio = targetCells
  // rows = sqrt(targetCells / aspectRatio)
  let rows = Math.floor(Math.sqrt(targetCells / imageAspectRatio))
  let cols = Math.floor(rows * imageAspectRatio)

  // Ensure minimum dimensions
  rows = Math.max(rows, 10)
  cols = Math.max(cols, 10)

  return {
    rows,
    cols,
    totalCells: rows * cols,
    availableDominoes: total,
    aspectRatio: imageAspectRatio,
    isPortrait: imageHeight > imageWidth
  }
}

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
  const historyIndexRef = useRef(historyIndex) // Keep ref in sync for use in callbacks

  // Palette: array of { hex, quantity, name? }, 'clear' is always first
  const [palette, setPalette] = useState(DEFAULT_PALETTE)

  // Currently selected color from palette (for painting) - stores hex string
  const [selectedColor, setSelectedColor] = useState(CLEAR)

  // Zoom level (percentage)
  const [zoom, setZoom] = useState(100)

  // Mirror mode: 'none', 'horizontal', 'vertical', 'both'
  const [mirrorMode, setMirrorMode] = useState('none')

  // Selection state
  const [selection, setSelection] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)

  // Drag selection state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const dragOffsetRef = useRef({ row: 0, col: 0 })
  const [dragPreview, setDragPreview] = useState(null)

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState(null)

  // Duplicate dragging state (Shift+D)
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false)
  const [duplicatePreview, setDuplicatePreview] = useState(null)
  const duplicateClipboard = useRef(null)

  // Fill popup state (Shift+F)
  const [showFillPopup, setShowFillPopup] = useState(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null)
  const [selectionContextMenu, setSelectionContextMenu] = useState(null)

  // Drag painting state
  const isPainting = useRef(false)

  // Track if we just finished a selection (to prevent click from clearing it)
  const justFinishedSelection = useRef(false)

  // File input refs
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const paletteInputRef = useRef(null)

  // Track unsaved changes for save reminder
  const unsavedSince = useRef(null)
  const gridSnapshotRef = useRef(cloneGrid(grid)) // Snapshot of "saved" grid state

  // Refs to access current state in timer callback without dependencies
  const gridRef = useRef(grid)
  const paletteRef = useRef(palette)
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { paletteRef.current = palette }, [palette])

  // Helper to compare two grids
  const gridsAreEqual = (grid1, grid2) => {
    if (!grid1 || !grid2) return false
    if (grid1.length !== grid2.length) return false
    for (let r = 0; r < grid1.length; r++) {
      if (grid1[r].length !== grid2[r].length) return false
      for (let c = 0; c < grid1[r].length; c++) {
        if (grid1[r][c] !== grid2[r][c]) return false
      }
    }
    return true
  }

  // Save state to history
  const saveToHistory = useCallback((newGrid) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false
      return
    }
    // Use ref to get current historyIndex value (avoids stale closure)
    const currentIndex = historyIndexRef.current
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(cloneGrid(newGrid))
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    const newIndex = Math.min(currentIndex + 1, MAX_HISTORY - 1)
    setHistoryIndex(newIndex)
    historyIndexRef.current = newIndex
    // Mark when unsaved changes started (only if not already tracking)
    if (unsavedSince.current === null) {
      unsavedSince.current = Date.now()
    }
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      historyIndexRef.current = newIndex
      setGrid(cloneGrid(history[newIndex]))
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      historyIndexRef.current = newIndex
      setGrid(cloneGrid(history[newIndex]))
    }
  }, [history, historyIndex])

  // Initialize history with first grid state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([cloneGrid(grid)])
      setHistoryIndex(0)
      historyIndexRef.current = 0
    }
  }, [])

  // Save reminder - check every 30 seconds if 5 minutes have passed since first unsaved change
  useEffect(() => {
    const FIVE_MINUTES = 5 * 60 * 1000
    const CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds

    const intervalId = setInterval(() => {
      if (unsavedSince.current !== null) {
        const elapsed = Date.now() - unsavedSince.current
        if (elapsed >= FIVE_MINUTES) {
          const currentGrid = gridRef.current
          const snapshot = gridSnapshotRef.current

          // Only show reminder if grid has actually changed from the saved snapshot
          if (gridsAreEqual(currentGrid, snapshot)) {
            // Grid is the same as the saved state - no reminder needed
            unsavedSince.current = null
            return
          }

          const shouldSave = window.confirm(
            'You have unsaved changes!\n\nWould you like to save your progress now?\n\nClick OK to save, or Cancel to dismiss this reminder.'
          )
          if (shouldSave) {
            // Prompt for filename
            const defaultName = 'domino-layout'
            const filename = window.prompt('Enter a name for your file:', defaultName)
            if (filename === null) {
              // User cancelled the prompt - reset timer
              unsavedSince.current = Date.now()
              return
            }
            const finalName = filename.trim() || defaultName

            // Trigger save - use refs to get current values
            const currentPalette = paletteRef.current
            const data = {
              rows: currentGrid.length,
              columns: currentGrid[0]?.length || 0,
              cells: currentGrid,
              palette: currentPalette
            }
            const json = JSON.stringify(data, null, 2)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${finalName}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            unsavedSince.current = null
            gridSnapshotRef.current = cloneGrid(currentGrid)
          } else {
            // User dismissed - reset timer for another 5 mins
            unsavedSince.current = Date.now()
          }
        }
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(intervalId)
  }, []) // No dependencies - uses refs

  // Apply row/column input changes - accepts optional override values for immediate update
  const applyGridSize = useCallback((overrideRows, overrideCols) => {
    const newRows = Math.max(1, overrideRows ?? rowInput)
    const newCols = Math.max(1, overrideCols ?? colInput)
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

  // Clear the entire grid
  const clearGrid = useCallback(() => {
    const newGrid = grid.map(row => row.map(() => CLEAR))
    saveToHistory(newGrid)
    setGrid(newGrid)
  }, [grid, saveToHistory])


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

  // Paint a single cell
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

  // Keyboard shortcuts
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selection) {
        e.preventDefault()
        copySelection()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        pasteClipboard()
      }
      // Shift+D: Duplicate selection with drag
      if (e.shiftKey && e.key === 'D' && selection && !isDuplicateDragging) {
        e.preventDefault()
        // Copy the selection content
        const { startRow, startCol, endRow, endCol } = selection
        const content = []
        for (let r = startRow; r <= endRow; r++) {
          const row = []
          for (let c = startCol; c <= endCol; c++) {
            row.push(grid[r][c])
          }
          content.push(row)
        }
        duplicateClipboard.current = {
          content,
          rows: endRow - startRow + 1,
          cols: endCol - startCol + 1
        }
        setIsDuplicateDragging(true)
        // Start preview at selection location
        setDuplicatePreview({
          startRow,
          startCol,
          endRow,
          endCol
        })
      }
      // Shift+F: Fill selection with currently selected color
      if (e.shiftKey && e.key === 'F' && selection) {
        e.preventDefault()
        fillSelection()
      }
      if (e.key === 'Escape') {
        setSelection(null)
        setContextMenu(null)
        setIsDuplicateDragging(false)
        setDuplicatePreview(null)
        setShowFillPopup(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selection, clipboard, grid, isDuplicateDragging, fillSelection, copySelection, pasteClipboard])

  // Clear section (fill with 'clear')
  const clearSectionWithClear = useCallback(() => {
    if (!selection) return
    const { startRow, startCol, endRow, endCol } = selection
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newGrid[r][c] = CLEAR
        }
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [selection, saveToHistory])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  // Check if a cell is inside the current selection
  const isCellInSelection = useCallback((row, col) => {
    if (!selection) return false
    return row >= selection.startRow && row <= selection.endRow &&
           col >= selection.startCol && col <= selection.endCol
  }, [selection])

  // Start dragging the selection
  const startDragSelection = useCallback((row, col) => {
    if (!selection) return
    setIsDraggingSelection(true)
    // Store where within the selection the user clicked
    dragOffsetRef.current = {
      row: row - selection.startRow,
      col: col - selection.startCol
    }
    // Initial preview at current position
    setDragPreview({
      startRow: selection.startRow,
      startCol: selection.startCol,
      endRow: selection.endRow,
      endCol: selection.endCol
    })
  }, [selection])

  // Update drag preview position
  const moveDragSelection = useCallback((row, col) => {
    if (!isDraggingSelection || !selection) return
    const newStartRow = row - dragOffsetRef.current.row
    const newStartCol = col - dragOffsetRef.current.col
    const height = selection.endRow - selection.startRow
    const width = selection.endCol - selection.startCol
    setDragPreview({
      startRow: newStartRow,
      startCol: newStartCol,
      endRow: newStartRow + height,
      endCol: newStartCol + width
    })
  }, [isDraggingSelection, selection])

  // End drag and move the selection
  const endDragSelection = useCallback(() => {
    if (!isDraggingSelection || !selection || !dragPreview) {
      setIsDraggingSelection(false)
      setDragPreview(null)
      return
    }

    // Extract the selected cells
    const selectedCells = []
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      const row = []
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        row.push(grid[r]?.[c] || 'clear')
      }
      selectedCells.push(row)
    }

    setGrid(prev => {
      const newGrid = prev.map(r => [...r])

      // First, clear the original location (fill with 'clear')
      for (let r = selection.startRow; r <= selection.endRow; r++) {
        for (let c = selection.startCol; c <= selection.endCol; c++) {
          if (r >= 0 && r < newGrid.length && c >= 0 && c < newGrid[0].length) {
            newGrid[r][c] = 'clear'
          }
        }
      }

      // Then, place at new location
      for (let r = 0; r < selectedCells.length; r++) {
        for (let c = 0; c < selectedCells[r].length; c++) {
          const targetR = dragPreview.startRow + r
          const targetC = dragPreview.startCol + c
          if (targetR >= 0 && targetR < newGrid.length && targetC >= 0 && targetC < newGrid[0].length) {
            newGrid[targetR][targetC] = selectedCells[r][c]
          }
        }
      }

      saveToHistory(newGrid)
      return newGrid
    })

    // Update selection to new position
    setSelection({
      startRow: Math.max(0, dragPreview.startRow),
      startCol: Math.max(0, dragPreview.startCol),
      endRow: Math.min(grid.length - 1, dragPreview.endRow),
      endCol: Math.min(grid[0].length - 1, dragPreview.endCol)
    })

    setIsDraggingSelection(false)
    setDragPreview(null)
  }, [isDraggingSelection, selection, dragPreview, grid, saveToHistory])

  // Replace all instances of one color with another
  const replaceColor = useCallback((sourceColor, targetColor, selectionBounds) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      if (selectionBounds) {
        // Replace only within selection
        const { startRow, startCol, endRow, endCol } = selectionBounds
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (newGrid[r][c] === sourceColor) {
              newGrid[r][c] = targetColor
            }
          }
        }
      } else {
        // Replace in entire grid
        for (let r = 0; r < newGrid.length; r++) {
          for (let c = 0; c < newGrid[r].length; c++) {
            if (newGrid[r][c] === sourceColor) {
              newGrid[r][c] = targetColor
            }
          }
        }
      }
      saveToHistory(newGrid)
      return newGrid
    })
  }, [saveToHistory])

  // Drag painting handlers
  const handleMouseDown = useCallback((row, col, e) => {
    // If in duplicate mode, place the duplicate
    if (isDuplicateDragging && duplicatePreview && duplicateClipboard.current) {
      setGrid(prev => {
        const newGrid = prev.map(r => [...r])
        const { content } = duplicateClipboard.current
        for (let r = 0; r < content.length; r++) {
          for (let c = 0; c < content[r].length; c++) {
            const targetR = duplicatePreview.startRow + r
            const targetC = duplicatePreview.startCol + c
            if (targetR >= 0 && targetR < newGrid.length &&
                targetC >= 0 && targetC < newGrid[0].length) {
              newGrid[targetR][targetC] = content[r][c]
            }
          }
        }
        saveToHistory(newGrid)
        return newGrid
      })
      setIsDuplicateDragging(false)
      setDuplicatePreview(null)
      return
    }

    if (e.shiftKey) {
      handleSelectionStart(row, col)
    } else if (isCellInSelection(row, col)) {
      // Start dragging the selection
      startDragSelection(row, col)
    } else {
      // Clear selection when clicking outside it
      if (selection) {
        setSelection(null)
      }
      isPainting.current = true
      paintCell(row, col)
    }
  }, [paintCell, handleSelectionStart, isCellInSelection, startDragSelection, selection, isDuplicateDragging, duplicatePreview, saveToHistory])

  const handleMouseEnter = useCallback((row, col) => {
    // Update duplicate preview position
    if (isDuplicateDragging && duplicateClipboard.current) {
      const { rows, cols } = duplicateClipboard.current
      setDuplicatePreview({
        startRow: row,
        startCol: col,
        endRow: row + rows - 1,
        endCol: col + cols - 1
      })
      return
    }

    if (isDraggingSelection) {
      moveDragSelection(row, col)
    } else if (isPainting.current) {
      paintCell(row, col)
    }
    if (isSelecting) {
      handleSelectionMove(row, col)
    }
  }, [paintCell, isSelecting, handleSelectionMove, isDraggingSelection, moveDragSelection, isDuplicateDragging])

  const handleMouseUp = useCallback(() => {
    if (isDraggingSelection) {
      endDragSelection()
      justFinishedSelection.current = true
    } else if (isPainting.current) {
      saveToHistory(grid)
    }
    isPainting.current = false
    // If we were selecting, mark it so click handler doesn't clear selection
    if (isSelecting) {
      justFinishedSelection.current = true
    }
    handleSelectionEnd()
  }, [grid, saveToHistory, handleSelectionEnd, isDraggingSelection, endDragSelection, isSelecting])

  // Context menu handlers
  const handleContextMenu = useCallback((e, type, index) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      index
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Cell context menu handler - shows selection menu if cell is in selection
  const handleCellContextMenu = useCallback((e, row, col) => {
    e.preventDefault()
    // Only show selection context menu if there's a selection and the click is within it
    if (selection &&
        row >= selection.startRow && row <= selection.endRow &&
        col >= selection.startCol && col <= selection.endCol) {
      setSelectionContextMenu({
        x: e.clientX,
        y: e.clientY
      })
    }
  }, [selection])

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

  // Delete multiple rows starting at index
  const deleteRows = useCallback((startIndex, count) => {
    const maxDeletable = grid.length - 1
    const actualCount = Math.min(count, maxDeletable)
    if (actualCount <= 0) return
    setGrid(prev => {
      const newGrid = prev.filter((_, i) => i < startIndex || i >= startIndex + actualCount)
      setRowInput(newGrid.length)
      saveToHistory(newGrid)
      return newGrid
    })
    setSelection(null)
  }, [grid.length, saveToHistory])

  // Delete multiple columns starting at index
  const deleteColumns = useCallback((startIndex, count) => {
    const currentCols = grid[0]?.length || 0
    const maxDeletable = currentCols - 1
    const actualCount = Math.min(count, maxDeletable)
    if (actualCount <= 0) return
    setGrid(prev => {
      const newGrid = prev.map(row => row.filter((_, i) => i < startIndex || i >= startIndex + actualCount))
      setColInput(newGrid[0]?.length || 0)
      saveToHistory(newGrid)
      return newGrid
    })
    setSelection(null)
  }, [grid, saveToHistory])

  // Close selection context menu
  const closeSelectionContextMenu = useCallback(() => {
    setSelectionContextMenu(null)
  }, [])

  // Save grid to JSON file
  const saveGrid = useCallback(() => {
    // Prompt for filename
    const defaultName = 'domino-layout'
    const filename = window.prompt('Enter a name for your file:', defaultName)
    if (filename === null) return // User cancelled

    const finalName = filename.trim() || defaultName

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
    a.download = `${finalName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    // Mark as saved - update the snapshot and clear the timer
    unsavedSince.current = null
    gridSnapshotRef.current = cloneGrid(grid)
  }, [grid, palette])

  // Load grid from JSON file
  const loadGrid = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Calculate optimal zoom to fit grid in viewport
  const calculateOptimalZoom = useCallback((rows, cols) => {
    // Grid sizing constants (must match DominoGrid.jsx)
    const BASE_DOMINO_WIDTH = 90
    const BASE_DOMINO_HEIGHT = 30
    const BASE_H_GAP = 15
    const BASE_V_GAP = 30
    const BASE_LABEL_WIDTH = 30
    const BASE_FILL_BTN_SIZE = 24

    // Calculate grid dimensions at 100% zoom
    const gridWidth = BASE_LABEL_WIDTH + (BASE_FILL_BTN_SIZE + 10) + cols * BASE_DOMINO_WIDTH + (cols - 1) * BASE_H_GAP
    const gridHeight = BASE_LABEL_WIDTH + (BASE_FILL_BTN_SIZE + 10) + rows * BASE_DOMINO_HEIGHT + (rows - 1) * BASE_V_GAP

    // Get available viewport (with padding for controls and margins)
    const availableWidth = window.innerWidth - 100 // padding for margins
    const availableHeight = window.innerHeight - 400 // space for header, controls, stats

    // Calculate zoom to fit both dimensions
    const zoomX = (availableWidth / gridWidth) * 100
    const zoomY = (availableHeight / gridHeight) * 100

    // Use the smaller zoom to ensure it fits, but clamp to reasonable range
    const optimalZoom = Math.min(zoomX, zoomY)
    return Math.max(20, Math.min(200, Math.round(optimalZoom)))
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
            // Normalize palette to new format
            const normalized = normalizePalette(data.palette)
            const hasClear = normalized.some(p => p.hex === CLEAR)
            setPalette(hasClear ? normalized : [CLEAR_PALETTE_ITEM, ...normalized])
          }
          // Auto-zoom to fit the loaded grid
          const optimalZoom = calculateOptimalZoom(data.rows, data.columns)
          setZoom(optimalZoom)
          // Update snapshot to loaded grid (this is now the "saved" state)
          gridSnapshotRef.current = cloneGrid(data.cells)
          unsavedSince.current = null
        }
      } catch (err) {
        console.error('Failed to load grid:', err)
        alert('Failed to load grid file. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [saveToHistory, calculateOptimalZoom])

  // Import palette from file
  const importPalette = useCallback(() => {
    paletteInputRef.current?.click()
  }, [])

  const handlePaletteImport = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target.result

        let colors = []
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content)
          colors = data.colors || data // Support { colors: [...] } or direct array
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(l => l.trim())
          // Skip header if it looks like one
          const startIndex = lines[0].toLowerCase().includes('hex') ||
                            lines[0].toLowerCase().includes('color') ||
                            lines[0].toLowerCase().includes('name') ? 1 : 0

          let naCount = 0 // Track N/A entries
          const specialColors = [] // Clear, Disney
          const regularColors = [] // Normal hex colors

          lines.slice(startIndex).forEach(line => {
            const parts = line.split(',').map(p => p.trim())
            // Format: name, quantity, hex
            const name = parts[0] || undefined
            const quantity = parseInt(parts[1]) || Infinity
            let hex = parts[2]?.toLowerCase() || ''

            // Handle N/A values
            if (hex === 'n/a' || hex === 'na' || hex === '') {
              naCount++
              if (naCount === 1) {
                // First N/A is Clear
                specialColors.push({ hex: CLEAR, quantity, name: name || 'Clear' })
              } else if (naCount === 2) {
                // Second N/A is Disney (metallic)
                specialColors.push({ hex: DISNEY, quantity, name: name || 'Disney' })
              }
              return
            }

            // Add # if missing
            if (hex && !hex.startsWith('#')) {
              hex = '#' + hex
            }

            if (hex.match(/^#[0-9a-f]{6}$/i)) {
              regularColors.push({ hex, quantity, name })
            }
          })

          // Sort regular colors by hue (rainbow order)
          regularColors.sort((a, b) => getHue(a.hex) - getHue(b.hex))

          if (specialColors.length > 0 || regularColors.length > 0) {
            // Combine: special colors first (Clear, Disney), then rainbow-sorted colors
            setPalette([...specialColors, ...regularColors])
            setSelectedColor(specialColors[0]?.hex || regularColors[0]?.hex || CLEAR)
          }
        }

        if (file.name.endsWith('.json') && colors.length > 0) {
          // Sort JSON colors by hue too
          colors.sort((a, b) => {
            if (a.hex === CLEAR || a.hex === DISNEY) return -1
            if (b.hex === CLEAR || b.hex === DISNEY) return 1
            return getHue(a.hex) - getHue(b.hex)
          })
          setPalette(colors)
          setSelectedColor(colors[0]?.hex || CLEAR)
        }
      } catch (err) {
        console.error('Failed to import palette:', err)
        alert('Failed to import palette. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [])

  // Import from image - maps to closest palette colors
  const importFromImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageImport = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if palette has colors besides clear
    const hasColors = palette.some(p => p.hex !== CLEAR && p.hex !== DISNEY)
    if (!hasColors) {
      alert('Please import a palette with colors first, or add colors to your palette.')
      event.target.value = ''
      return
    }

    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        // Get image dimensions to calculate optimal grid size
        const imageWidth = img.naturalWidth
        const imageHeight = img.naturalHeight
        const optimal = getOptimalGridForImage(imageWidth, imageHeight, palette)

        const orientationNote = optimal.isPortrait
          ? '(Portrait orientation detected)'
          : '(Landscape orientation detected)'

        const recommendationMsg = `Image Import - Optimal Grid Size

Image: ${imageWidth} × ${imageHeight} pixels ${orientationNote}
Available dominoes: ${optimal.availableDominoes}

RECOMMENDED: ${optimal.rows} rows × ${optimal.cols} columns
(${optimal.totalCells} dominoes, preserves image aspect ratio)

This will maximize domino usage while staying within color limits.
Colors that run out will automatically use the next-closest available color.

Click OK to use recommended size
Click Cancel to abort import`

        if (!confirm(recommendationMsg)) {
          event.target.value = ''
          return
        }

        const targetRows = optimal.rows
        const targetCols = optimal.cols

        // Update the input fields to reflect the new size
        setRowInput(targetRows)
        setColInput(targetCols)

        // Create canvas and draw image
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = targetCols
        canvas.height = targetRows

        ctx.drawImage(img, 0, 0, targetCols, targetRows)

        const imageData = ctx.getImageData(0, 0, targetCols, targetRows)
        const pixels = imageData.data

        // Extract pixel colors as hex values
        const pixelColors = []
        for (let r = 0; r < targetRows; r++) {
          const row = []
          for (let c = 0; c < targetCols; c++) {
            const idx = (r * targetCols + c) * 4
            const red = pixels[idx]
            const green = pixels[idx + 1]
            const blue = pixels[idx + 2]
            const alpha = pixels[idx + 3]

            if (alpha < 128) {
              row.push('clear')
            } else {
              row.push(rgbToHex(red, green, blue))
            }
          }
          pixelColors.push(row)
        }

        // Use two-pass algorithm for better color distribution
        // This ensures colors are spread evenly across the image
        // rather than being used up at the top and causing chaos at the bottom
        const newGrid = distributeColorsEvenly(pixelColors, palette)

        setGrid(newGrid)
        saveToHistory(newGrid)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }, [palette, saveToHistory])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu, closeContextMenu])

  // Close selection context menu on click outside
  useEffect(() => {
    const handleClick = () => closeSelectionContextMenu()
    if (selectionContextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [selectionContextMenu, closeSelectionContextMenu])

  // Handle clicks on app background to deselect
  const handleAppClick = useCallback((e) => {
    // Skip if we just finished a selection/drag action (click fires after mouseup)
    if (justFinishedSelection.current) {
      justFinishedSelection.current = false
      return
    }

    // Only clear selection if clicking directly on app background or non-interactive areas
    // Check if the click target is a grid cell or interactive element
    const target = e.target
    const isGridCell = target.closest('.domino-cell')
    const isButton = target.closest('button')
    const isInput = target.closest('input')
    const isContextMenu = target.closest('.context-menu')
    const isFillPopup = target.closest('.fill-popup')
    const isColorReplace = target.closest('.color-replace-menu')
    const isPaletteSwatch = target.closest('.palette-swatch')

    if (!isGridCell && !isButton && !isInput && !isContextMenu && !isFillPopup && !isColorReplace && !isPaletteSwatch) {
      if (selection) {
        setSelection(null)
      }
    }
  }, [selection])

  return (
    <div
      className="app"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleAppClick}
    >
      <h1 className="app-title">Domino Planner</h1>

      <ColorPalette
        palette={palette}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
        onReplaceColor={replaceColor}
        selection={selection}
        grid={grid}
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

      <input
        type="file"
        ref={paletteInputRef}
        className="hidden-input"
        accept=".json,.csv"
        onChange={handlePaletteImport}
      />

      <DominoStats grid={grid} palette={palette} />

      <DominoGrid
        grid={grid}
        zoom={zoom}
        palette={palette}
        selection={selection}
        dragPreview={dragPreview}
        isDraggingSelection={isDraggingSelection}
        duplicatePreview={duplicatePreview}
        isDuplicateDragging={isDuplicateDragging}
        onCellMouseDown={handleMouseDown}
        onCellMouseEnter={handleMouseEnter}
        onCellContextMenu={handleCellContextMenu}
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
          onDeleteRows={deleteRows}
          onDeleteColumns={deleteColumns}
          onClose={closeContextMenu}
          canDelete={
            contextMenu.type === 'row'
              ? grid.length > 1
              : (grid[0]?.length || 0) > 1
          }
          maxDelete={
            contextMenu.type === 'row'
              ? grid.length - 1
              : (grid[0]?.length || 1) - 1
          }
        />
      )}

      {selectionContextMenu && selection && (
        <SelectionContextMenu
          x={selectionContextMenu.x}
          y={selectionContextMenu.y}
          selection={selection}
          onDeleteRows={deleteRows}
          onDeleteColumns={deleteColumns}
          onClearSection={clearSectionWithClear}
          onClose={closeSelectionContextMenu}
          gridRows={grid.length}
          gridCols={grid[0]?.length || 0}
        />
      )}

      {showFillPopup && selection && (
        <FillColorPopup
          palette={palette}
          onSelectColor={fillSelection}
          onClose={() => setShowFillPopup(false)}
        />
      )}
    </div>
  )
}

export default App
