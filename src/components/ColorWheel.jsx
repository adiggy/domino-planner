import { useRef, useCallback, useEffect, useState } from 'react'

// Convert HSL to Hex
function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Convert Hex to HSL
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }

  return { h, s: s * 100, l: l * 100 }
}

function ColorWheel({ value, onChange }) {
  const wheelRef = useRef(null)
  const sliderRef = useRef(null)
  const [isDraggingWheel, setIsDraggingWheel] = useState(false)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  // Parse current value to HSL
  const hsl = hexToHsl(value || '#ff0000')
  const [hue, setHue] = useState(hsl.h)
  const [saturation, setSaturation] = useState(hsl.s)
  const [lightness, setLightness] = useState(hsl.l)

  // Update internal state when value prop changes
  useEffect(() => {
    const newHsl = hexToHsl(value || '#ff0000')
    setHue(newHsl.h)
    setSaturation(newHsl.s)
    setLightness(newHsl.l)
  }, [value])

  // Emit color change
  const emitChange = useCallback((h, s, l) => {
    const hex = hslToHex(h, s, l)
    onChange(hex)
  }, [onChange])

  // Handle wheel click/drag
  const handleWheelInteraction = useCallback((e) => {
    if (!wheelRef.current) return

    const rect = wheelRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = e.clientX - rect.left - centerX
    const y = e.clientY - rect.top - centerY

    // Calculate angle (hue)
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360

    // Calculate distance from center (saturation)
    const maxRadius = rect.width / 2
    const distance = Math.min(Math.sqrt(x * x + y * y), maxRadius)
    const sat = (distance / maxRadius) * 100

    setHue(angle)
    setSaturation(sat)
    emitChange(angle, sat, lightness)
  }, [lightness, emitChange])

  // Handle lightness slider
  const handleSliderInteraction = useCallback((e) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100))

    setLightness(l)
    emitChange(hue, saturation, l)
  }, [hue, saturation, emitChange])

  // Mouse event handlers
  const handleWheelMouseDown = (e) => {
    setIsDraggingWheel(true)
    handleWheelInteraction(e)
  }

  const handleSliderMouseDown = (e) => {
    setIsDraggingSlider(true)
    handleSliderInteraction(e)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingWheel) handleWheelInteraction(e)
      if (isDraggingSlider) handleSliderInteraction(e)
    }

    const handleMouseUp = () => {
      setIsDraggingWheel(false)
      setIsDraggingSlider(false)
    }

    if (isDraggingWheel || isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingWheel, isDraggingSlider, handleWheelInteraction, handleSliderInteraction])

  // Calculate indicator position on wheel
  const indicatorAngle = (hue - 90) * (Math.PI / 180)
  const indicatorRadius = (saturation / 100) * 60 // 60 = half of wheel size
  const indicatorX = 60 + Math.cos(indicatorAngle) * indicatorRadius
  const indicatorY = 60 + Math.sin(indicatorAngle) * indicatorRadius

  // Lightness slider indicator position
  const sliderIndicatorY = (1 - lightness / 100) * 100

  return (
    <div className="color-wheel-container">
      <div
        ref={wheelRef}
        className="color-wheel"
        onMouseDown={handleWheelMouseDown}
        style={{
          background: `conic-gradient(
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
          )`
        }}
      >
        <div className="color-wheel-saturation" />
        <div
          className="color-wheel-indicator"
          style={{
            left: indicatorX,
            top: indicatorY,
            backgroundColor: value
          }}
        />
      </div>

      <div
        ref={sliderRef}
        className="lightness-slider"
        onMouseDown={handleSliderMouseDown}
        style={{
          background: `linear-gradient(to bottom,
            hsl(${hue}, ${saturation}%, 100%),
            hsl(${hue}, ${saturation}%, 50%),
            hsl(${hue}, ${saturation}%, 0%)
          )`
        }}
      >
        <div
          className="lightness-indicator"
          style={{ top: `${sliderIndicatorY}%` }}
        />
      </div>

      <div
        className="color-preview"
        style={{ backgroundColor: value }}
      />
    </div>
  )
}

export default ColorWheel
