import { useEffect, useRef } from 'react'

const CLEAR = 'clear'
const DISNEY = 'disney'

function FillColorPopup({ palette, onSelectColor, onClose }) {
  const popupRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Use setTimeout to avoid immediate trigger from the keydown
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div className="fill-popup-overlay">
      <div className="fill-popup" ref={popupRef}>
        <div className="fill-popup-header">
          Fill selection with:
        </div>
        <div className="fill-popup-colors">
          {palette.map((paletteItem, index) => {
            const colorHex = paletteItem.hex
            const isClear = colorHex === CLEAR
            const isDisney = colorHex === DISNEY
            const isSpecial = isClear || isDisney
            const isWhite = colorHex.toLowerCase() === '#ffffff'

            return (
              <div
                key={index}
                className={`fill-popup-swatch
                  ${isClear ? 'clear-swatch' : ''}
                  ${isDisney ? 'disney-swatch' : ''}
                  ${isWhite ? 'white-swatch' : ''}
                `}
                style={!isSpecial ? { backgroundColor: colorHex } : undefined}
                onClick={() => {
                  onSelectColor(colorHex)
                  onClose()
                }}
                title={paletteItem.name || colorHex}
              >
                {isClear && 'C'}
                {isDisney && 'D'}
              </div>
            )
          })}
        </div>
        <div className="fill-popup-hint">
          Click a color to fill, or press Escape to cancel
        </div>
      </div>
    </div>
  )
}

export default FillColorPopup
