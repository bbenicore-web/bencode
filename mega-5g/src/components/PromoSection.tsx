import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { publicAsset } from '../publicAsset'

const ASSET_PATH = publicAsset('assets/promo')
const DETAILS_OVERLAP = 26
const COPY_SCROLL_DISTANCE = 0.7
const COPY_SCROLL_SCALE = 0.94
const HERO_IMAGE_END_SCALE = 1.18
const HERO_COPY_Y = -150
const TITLE_EXIT_GAP = 72
const TITLE_EXIT_DURATION = 0.25

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function PromoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const offerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    const details = document.getElementById('details')
    const image = imageRef.current
    const title = titleRef.current
    const offer = offerRef.current

    if (!section || !details || !image || !title || !offer) return

    const media = gsap.matchMedia()

    media.add(
      '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
      () => {
        const documentTop = (element: HTMLElement) => (
          element.getBoundingClientRect().top + window.scrollY
        )
        const titleExitLine = () => (
          title.offsetTop + title.offsetHeight + TITLE_EXIT_GAP
        )
        const startScroll = () => Math.max(
          0,
          documentTop(details) - section.offsetHeight + DETAILS_OVERLAP,
        )
        const endScroll = () => (
          startScroll() + Math.max(1, section.offsetHeight * COPY_SCROLL_DISTANCE)
        )
        const titleExitStart = () => Math.max(
          startScroll(),
          documentTop(details) - titleExitLine(),
        )

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: details,
            start: startScroll,
            end: endScroll,
            scrub: 0.25,
            invalidateOnRefresh: true,
          },
        })

        timeline
          .fromTo(
            image,
            { scale: 1 },
            { scale: HERO_IMAGE_END_SCALE, duration: 1 },
            0,
          )
          .fromTo(
            offer,
            { y: 0, scale: 1, transformOrigin: '50% 50%' },
            {
              y: HERO_COPY_Y,
              scale: COPY_SCROLL_SCALE,
              duration: 1,
            },
            0,
          )

        gsap
          .timeline({
            scrollTrigger: {
              trigger: details,
              start: titleExitStart,
              toggleActions: 'play none none reverse',
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            title,
            {
              autoAlpha: 1,
              scale: 1,
              transformOrigin: '50% 50%',
            },
            {
              autoAlpha: 0,
              scale: 0,
              duration: TITLE_EXIT_DURATION,
              ease: 'power4.in',
            },
          )
      },
    )

    return () => media.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="promo" aria-labelledby="promo-title">
      <div className="promo__gradient" aria-hidden="true" />

      <div className="promo__rail">
        <div className="promo__visual" aria-hidden="true">
          <img
            ref={imageRef}
            src={`${ASSET_PATH}/hero-orbit.png`}
            alt=""
            width="1000"
            height="1000"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <nav className="promo__breadcrumbs" aria-label="Хлебные крошки">
          <ol>
            <li>МегаФон</li>
            <li>Услуги и опции</li>
            <li>
              <span aria-current="page">Мега 5G</span>
            </li>
          </ol>
        </nav>

        <h1 ref={titleRef} id="promo-title" className="promo__title">
          <span>Мега 5G</span>
          <img
            src={`${ASSET_PATH}/title-arrow.svg`}
            alt=""
            width="20"
            height="20"
          />
        </h1>

        <div ref={offerRef} className="promo__offer">
          <p>Скоростной интернет, который настроен под вашу жизнь</p>
          <a className="promo__button" href="#profiles">
            Выбрать профиль
          </a>
        </div>
      </div>
    </section>
  )
}
