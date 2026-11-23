/**
 * Logo oficial Aura Gym.
 *
 * O caminho usa Vite BASE_URL para funcionar em /auragym, raiz e builds móveis.
 * Se o arquivo oficial não carregar, tenta o ícone PNG legado já incluído no app.
 * Se ambos falharem, esconde a imagem para evitar o ícone de imagem quebrada.
 */
const LOGO_SRC = `${import.meta.env.BASE_URL}assets/aistudio/aura_gym_logo_circular_512_2c90e2c1.webp`
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
