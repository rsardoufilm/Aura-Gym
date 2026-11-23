/**
 * Logo oficial Aura Gym em PNG original 512×512.
 * O BASE_URL suporta raiz, subdiretório e builds Capacitor.
 * O fallback evita imagem quebrada em caso de falha do asset oficial.
 */
const LOGO_SRC = `${import.meta.env.BASE_URL}assets/aistudio/aura_gym_logo_circular_512_2c90e2c1.png`
const FALLBACK_SRC = `${import.meta.env.BASE_URL}icon-512.png`

export default function BrandLogo({ size = 48, alt = 'Aura Gym', className, style = {} }) {
  const handleError = event => {
    const image = event.currentTarget
    if (image.dataset.fallbackApplied !== 'true') {
      image.dataset.fallbackApplied = 'true'
      image.src = FALLBACK_SRC
      return
    }
    image.hidden = true
  }

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="eager"
      decoding="async"
      draggable="false"
      onError={handleError}
      style={{
        width: size,
        height: size,
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
        borderRadius: '50%',
        ...style,
      }}
    />
  )
}
