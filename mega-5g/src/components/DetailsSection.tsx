import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ExperienceCarousel } from './ExperienceCarousel'
import { publicAsset } from '../publicAsset'

const FEATURE_PATH = publicAsset('assets/features')
const DETAILS_OVERLAP = 26
const ENTRANCE_VIEWPORT_INSET = 15

gsap.registerPlugin(useGSAP, ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const technologies = [
  {
    title: 'Приоритет сети 5G',
    description: 'Вы всегда на связи, даже в переполненной сети',
    image: 'priority-3d.webp',
    className: 'technology-card--priority',
  },
  {
    title: 'Ускорение 60%',
    description: 'Интернет работает на 60% быстрее, чем 4G',
    image: 'speed-3d.webp',
    className: 'technology-card--speed',
  },
]

export function DetailsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentMaskRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    const contentMask = contentMaskRef.current
    const content = contentRef.current
    const promo = section?.previousElementSibling

    if (!section || !contentMask || !content || !(promo instanceof HTMLElement)) return

    const technologyCards = gsap.utils.toArray<HTMLElement>('.technology-card', section)
    const technologyImages = gsap.utils.toArray<HTMLImageElement>('.technology-card > img', section)

    const media = gsap.matchMedia()

    media.add(
      '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
      () => {
        const expandedScale = () => section.clientWidth / contentMask.offsetWidth
        const contentCounterScale = () => 1 / expandedScale()
        const expansionStart = () => Math.max(
          0,
          section.getBoundingClientRect().top
            + window.scrollY
            - promo.offsetHeight
            + DETAILS_OVERLAP,
        )

        const timeline = gsap.timeline({
          defaults: { duration: 1, ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: expansionStart,
            end: '+=160',
            scrub: 0.25,
            invalidateOnRefresh: true,
          },
        })

        timeline
          .fromTo(contentMask, { scaleX: 1 }, { scaleX: expandedScale }, 0)
          .fromTo(content, { scaleX: 1 }, { scaleX: contentCounterScale }, 0)

        technologyCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            {
              autoAlpha: 0,
              rotationX: -68,
              z: -36,
              transformPerspective: 900,
              transformOrigin: '50% 0%',
              willChange: 'transform,opacity',
            },
            {
              autoAlpha: 1,
              rotationX: 0,
              z: 0,
              transformPerspective: 900,
              duration: 0.84,
              delay: index * 0.06,
              ease: 'power3.out',
              clearProps: 'willChange',
              scrollTrigger: {
                trigger: card,
                start: `top ${100 - ENTRANCE_VIEWPORT_INSET}%`,
                toggleActions: 'play none none reverse',
              },
            },
          )
        })
      },
    )

    technologyImages.forEach((image) => {
      void image.decode().catch(() => undefined)
    })

    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh()
    })

    return () => {
      cancelled = true
      media.revert()
    }
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} id="details" className="details" aria-labelledby="details-title">
      <div ref={contentMaskRef} className="details__content-mask">
        <div ref={contentRef} className="details__content">
          <ExperienceCarousel />

          <h2 id="details-title" className="details__title">
            Технологии будущего<br />во всех профилях
          </h2>

          <div className="technology-list">
            {technologies.map((technology) => (
              <article className={`technology-card ${technology.className}`} key={technology.title}>
                <div className="technology-card__copy">
                  <h3>{technology.title}</h3>
                  <p>{technology.description}</p>
                </div>
                <img src={`${FEATURE_PATH}/${technology.image}`} alt="" decoding="async" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
