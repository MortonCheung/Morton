interface KickerProps {
  index?: string
  label: string
  zh?: string
  className?: string
}

export function Kicker({ index, label, zh, className }: KickerProps) {
  return (
    <p className={`kicker${className ? ` ${className}` : ''}`}>
      <span className="kicker__rule" aria-hidden="true" />
      {index ? <span className="kicker__index">{index}</span> : null}
      <span className="kicker__label">{label}</span>
      {zh ? <span className="kicker__zh">{zh}</span> : null}
    </p>
  )
}
