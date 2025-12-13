import Image from 'next/image'

interface WhiteBoarLogoProps {
  width?: number
  height?: number
  className?: string
}

// Theme switching disabled - always use light theme logo
export function WhiteBoarLogo({
  width = 100,
  height = 100,
  className = "text-accent"
}: WhiteBoarLogoProps) {
  return (
    <Image
      src="/images/logo-whiteboar-black.png"
      alt="WhiteBoar Logo"
      width={width}
      height={height}
      className={className}
    />
  )
}