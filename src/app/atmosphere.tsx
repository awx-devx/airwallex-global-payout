export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="atmosphere-pill atmosphere-white atmosphere-left-a" />
      <span className="atmosphere-pill atmosphere-white atmosphere-left-b" />
      <span className="atmosphere-pill atmosphere-purple atmosphere-left-c" />
      <svg className="atmosphere-arc atmosphere-arc-lime" viewBox="0 0 220 360">
        <path d="M28 24 C 120 48, 36 210, 188 332" />
        <circle cx="28" cy="24" r="5" />
      </svg>
      <svg className="atmosphere-arc atmosphere-arc-dash" viewBox="0 0 180 240">
        <path d="M20 16 C 40 90, 150 40, 120 220" />
        <circle cx="120" cy="220" r="4" />
      </svg>
      <span className="atmosphere-pill atmosphere-white atmosphere-right-a" />
      <span className="atmosphere-pill atmosphere-white atmosphere-right-b" />
      <span className="atmosphere-pill atmosphere-ink atmosphere-right-c" />
      <span className="atmosphere-pill atmosphere-lime atmosphere-right-d" />
      <span className="atmosphere-dot" />
    </div>
  )
}
