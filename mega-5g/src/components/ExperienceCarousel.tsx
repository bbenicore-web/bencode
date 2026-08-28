import { useRef, useState, type KeyboardEvent } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { publicAsset } from '../publicAsset'

const FEATURE_PATH = publicAsset('assets/features')
const CARD_GAP = 4
const STACK_STEP = 8
const ENTRANCE_SCROLL_RATIO = 0.15
const RESET_SCROLL_Y = 12
const DETAILS_OVERLAP = 26
const DETAILS_EXPANSION_DISTANCE = 160
const AXIS_LOCK_THRESHOLD = 10
const SWIPE_TRIGGER_THRESHOLD = 24

const experiences = [
  {
    title: <>Быстрая<br />загрузка игр</>,
    icons: ['experience-games-left.svg', 'experience-games-right.svg'],
  },
  {
    title: <>Фильмы и сериалы<br />без ограничений</>,
    icons: ['experience-stream-left.svg', 'experience-stream-right.svg'],
  },
  {
    title: <>Раздача скоростного<br />интернета</>,
    icons: ['experience-hotspot-left.svg', 'experience-hotspot-right.svg'],
  },
  {
    title: <>Раздавайте быстрый интернет на другие устройства</>,
    icons: ['experience-share-left.svg', 'experience-share-right.svg'],
  },
]

const PAGE_COUNT = experiences.length - 1
const MAX_PAGE = PAGE_COUNT - 1

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function ExperienceCarousel() {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const goToPageRef = useRef<(page: number, animate?: boolean) => void>(() => undefined)
  const [page, setPage] = useState(0)

  useGSAP(() => {
    const root = rootRef.current
    const viewport = viewportRef.current
    const details = root?.closest('.details')
    const promo = details?.previousElementSibling
    if (
      !root
      || !viewport
      || !(details instanceof HTMLElement)
      || !(promo instanceof HTMLElement)
    ) return

    const media = gsap.matchMedia()

    media.add('(max-width: 767px)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('.experience-card', viewport)
      const cardSurfaces = gsap.utils.toArray<HTMLElement>('.experience-card__surface', viewport)
      if (cards.length === 0 || cardSurfaces.length !== cards.length) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const clampPage = gsap.utils.clamp(0, MAX_PAGE)
      let cardStep = Number.parseFloat(getComputedStyle(cards[0]).width) + CARD_GAP

      const goToPage = (requestedPage: number, animate = true) => {
        const nextPage = clampPage(Math.round(requestedPage))
        if (animate && nextPage === pageRef.current) return

        const stackTravel = cardStep - STACK_STEP
        const stackAnchorOffset = -nextPage * STACK_STEP

        pageRef.current = nextPage
        setPage(nextPage)

        gsap.killTweensOf(cards)

        const obsoleteCards = cards.slice(0, Math.max(0, nextPage - 1))
        if (obsoleteCards.length > 0) {
          gsap.set(obsoleteCards, { autoAlpha: 0 })
        }

        const target = {
          x: (index: number) => (
            index <= nextPage
              ? -stackTravel * index + stackAnchorOffset
              : -stackTravel * nextPage + stackAnchorOffset
          ),
          scale: (index: number) => 1 - Math.max(0, nextPage - index) * 0.06,
          autoAlpha: (index: number) => {
            if (index < nextPage - 1) return 0
            if (index === nextPage - 1) return 0.5
            return 1
          },
        }

        if (reduceMotion || !animate) {
          gsap.set(cards, target)
        } else {
          gsap.to(cards, {
            ...target,
            duration: 0.52,
            ease: 'power3.out',
            overwrite: true,
          })
        }
      }

      goToPageRef.current = goToPage
      goToPage(pageRef.current, false)

      if (!reduceMotion) {
        const entranceStart = () => Math.max(
          RESET_SCROLL_Y + 4,
          viewport.getBoundingClientRect().top
            + window.scrollY
            - promo.offsetHeight
            + promo.offsetHeight * ENTRANCE_SCROLL_RATIO,
        )
        const expansionEnd = () => Math.max(
          entranceStart() + 1,
          details.getBoundingClientRect().top
            + window.scrollY
            - promo.offsetHeight
            + DETAILS_OVERLAP
            + DETAILS_EXPANSION_DISTANCE,
        )

        gsap.set(cardSurfaces, {
          autoAlpha: 0,
          rotationX: -68,
          z: -36,
          transformPerspective: 900,
          transformOrigin: '50% 0%',
          willChange: 'transform,opacity',
        })

        const entranceTimeline = gsap
          .timeline({ paused: true })
          .to(cardSurfaces, {
            autoAlpha: 1,
            rotationX: 0,
            z: 0,
            transformPerspective: 900,
            duration: 0.84,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'willChange',
          })

        ScrollTrigger.create({
          trigger: viewport,
          start: entranceStart,
          end: expansionEnd,
          invalidateOnRefresh: true,
          onEnter: () => entranceTimeline.play(),
          onLeave: () => entranceTimeline.play(),
          onEnterBack: () => entranceTimeline.reverse(),
          onLeaveBack: () => entranceTimeline.pause(0),
        })

        ScrollTrigger.create({
          trigger: document.documentElement,
          start: RESET_SCROLL_Y,
          end: 'max',
          onLeaveBack: () => entranceTimeline.pause(0),
          onRefresh: () => {
            if (window.scrollY <= RESET_SCROLL_Y) entranceTimeline.pause(0)
          },
        })
      }

      let gesture: {
        source: 'pointer' | 'touch'
        id: number
        startX: number
        startY: number
        axis: 'x' | 'y' | null
        consumed: boolean
      } | null = null

      const updateGesture = (
        source: 'pointer' | 'touch',
        id: number,
        clientX: number,
        clientY: number,
        event: Event,
      ) => {
        if (!gesture || gesture.source !== source || gesture.id !== id) return

        const deltaX = clientX - gesture.startX
        const deltaY = clientY - gesture.startY
        const absoluteX = Math.abs(deltaX)
        const absoluteY = Math.abs(deltaY)

        if (!gesture.axis) {
          if (Math.max(absoluteX, absoluteY) < AXIS_LOCK_THRESHOLD) return
          gesture.axis = absoluteX > absoluteY ? 'x' : 'y'

          if (
            gesture.axis === 'x'
            && source === 'pointer'
            && !viewport.hasPointerCapture?.(id)
          ) {
            viewport.setPointerCapture?.(id)
          }
        }

        if (gesture.axis !== 'x') return

        if (event.cancelable) event.preventDefault()
        if (gesture.consumed || absoluteX < SWIPE_TRIGGER_THRESHOLD) return

        gesture.consumed = true
        goToPage(pageRef.current + (deltaX < 0 ? 1 : -1))
      }

      const prefersTouchEvents = 'ontouchstart' in window

      const onPointerDown = (event: PointerEvent) => {
        if (
          event.button !== 0
          || !event.isPrimary
          || (prefersTouchEvents && event.pointerType === 'touch')
        ) return

        gesture = {
          source: 'pointer',
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          axis: null,
          consumed: false,
        }
      }

      const onPointerMove = (event: PointerEvent) => {
        updateGesture('pointer', event.pointerId, event.clientX, event.clientY, event)
      }

      const finishPointer = (event: PointerEvent) => {
        if (!gesture || gesture.source !== 'pointer' || gesture.id !== event.pointerId) return

        if (event.type === 'pointerup') {
          updateGesture('pointer', event.pointerId, event.clientX, event.clientY, event)
        }

        if (viewport.hasPointerCapture?.(event.pointerId)) {
          viewport.releasePointerCapture(event.pointerId)
        }
        gesture = null
      }

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) {
          gesture = null
          return
        }

        const touch = event.touches[0]
        gesture = {
          source: 'touch',
          id: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          axis: null,
          consumed: false,
        }
      }

      const onTouchMove = (event: TouchEvent) => {
        if (!gesture || gesture.source !== 'touch') return
        if (event.touches.length !== 1) {
          gesture = null
          return
        }

        const touch = Array.from(event.touches).find(
          ({ identifier }) => identifier === gesture?.id,
        )
        if (!touch) return

        updateGesture('touch', touch.identifier, touch.clientX, touch.clientY, event)
      }

      const finishTouch = (event: TouchEvent) => {
        if (!gesture || gesture.source !== 'touch') return

        const endedTouch = Array.from(event.changedTouches).find(
          ({ identifier }) => identifier === gesture?.id,
        )
        if (endedTouch && event.type === 'touchend') {
          updateGesture(
            'touch',
            endedTouch.identifier,
            endedTouch.clientX,
            endedTouch.clientY,
            event,
          )
        }
        if (endedTouch || event.type === 'touchcancel') {
          gesture = null
        }
      }

      viewport.addEventListener('pointerdown', onPointerDown, { capture: true })
      viewport.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
      viewport.addEventListener('pointerup', finishPointer, { capture: true })
      viewport.addEventListener('pointercancel', finishPointer, { capture: true })
      viewport.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
      viewport.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
      viewport.addEventListener('touchend', finishTouch, { capture: true, passive: true })
      viewport.addEventListener('touchcancel', finishTouch, { capture: true, passive: true })

      let resizeFrame = 0
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame)
        resizeFrame = requestAnimationFrame(() => {
          cardStep = Number.parseFloat(getComputedStyle(cards[0]).width) + CARD_GAP
          goToPage(pageRef.current, false)
        })
      })
      resizeObserver.observe(viewport)

      return () => {
        if (
          gesture?.source === 'pointer'
          && viewport.hasPointerCapture?.(gesture.id)
        ) {
          viewport.releasePointerCapture(gesture.id)
        }
        gesture = null
        viewport.removeEventListener('pointerdown', onPointerDown, true)
        viewport.removeEventListener('pointermove', onPointerMove, true)
        viewport.removeEventListener('pointerup', finishPointer, true)
        viewport.removeEventListener('pointercancel', finishPointer, true)
        viewport.removeEventListener('touchstart', onTouchStart, true)
        viewport.removeEventListener('touchmove', onTouchMove, true)
        viewport.removeEventListener('touchend', finishTouch, true)
        viewport.removeEventListener('touchcancel', finishTouch, true)
        resizeObserver.disconnect()
        cancelAnimationFrame(resizeFrame)
        gsap.killTweensOf(cards)
        gsap.set(cards, { clearProps: 'transform,opacity,visibility' })
        gsap.set(cardSurfaces, { clearProps: 'transform,opacity,visibility,willChange' })
        goToPageRef.current = () => undefined
      }
    })

    return () => media.revert()
  }, { scope: rootRef })

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextPage: number | null = null

    if (event.key === 'ArrowRight') nextPage = pageRef.current + 1
    if (event.key === 'ArrowLeft') nextPage = pageRef.current - 1
    if (event.key === 'Home') nextPage = 0
    if (event.key === 'End') nextPage = MAX_PAGE

    if (nextPage === null) return
    event.preventDefault()
    goToPageRef.current(nextPage)
  }

  return (
    <div ref={rootRef} className="experience-carousel">
      <div
        ref={viewportRef}
        className="experience-viewport"
        role="region"
        aria-roledescription="карусель"
        aria-label="Преимущества Мега 5G"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="experience-list">
          {experiences.map((experience, index) => (
            <article
              className="experience-card"
              key={experience.icons[0]}
              role="group"
              aria-roledescription="слайд"
              aria-label={`${index + 1} из ${experiences.length}`}
              style={{ zIndex: index + 1 }}
            >
              <div className="experience-card__surface">
                <p>{experience.title}</p>
                <div className="experience-card__icons" aria-hidden="true">
                  {experience.icons.map((icon) => (
                    <img key={icon} src={`${FEATURE_PATH}/${icon}`} alt="" draggable="false" />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div
        className="experience-pagination"
        role="status"
        aria-live="polite"
      >
        {Array.from({ length: PAGE_COUNT }, (_, index) => (
          <span
            className={index === page ? 'is-active' : undefined}
            aria-hidden="true"
            key={index}
          />
        ))}
        <span className="visually-hidden">Положение {page + 1} из {PAGE_COUNT}</span>
      </div>
    </div>
  )
}
