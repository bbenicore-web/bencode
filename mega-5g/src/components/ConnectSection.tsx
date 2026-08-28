import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { NewSubscriberSection } from './NewSubscriberSection'
import { publicAsset } from '../publicAsset'

const CONNECT_PATH = publicAsset('assets/connect')
const STEP_ICON_OFFSET = 30.572
const VISIBLE_STEP_COUNT = 3
const AXIS_LOCK_THRESHOLD = 10
const SWIPE_TRIGGER_THRESHOLD = 24
const STEP_SHRINK_DURATION = 0.2
const STEP_PAUSE_DURATION = 0.02
const STEP_MOVE_DURATION = 0.3
const STEP_MOVE_START = STEP_SHRINK_DURATION + STEP_PAUSE_DURATION
const FUTURE_STEP_DELAY = STEP_MOVE_START + 0.08
const FUTURE_STEP_DURATION = 0.22
const STEP_EDGE_DURATION = STEP_MOVE_START + STEP_MOVE_DURATION
const PHONE_INACTIVE_SCALE = 0.985

gsap.registerPlugin(useGSAP)

const baseConnectSteps = [
  {
    screen: `${CONNECT_PATH}/app-screen.png`,
    copy: <>Войдите в Личный кабинет → Услуги<br />→ Плитка Мега 5G → Вы на месте,<br />выбирайте профиль.</>,
    announcement: 'Войдите в Личный кабинет, откройте услуги и плитку Мега 5G, затем выберите профиль.',
  },
  {
    screen: `${CONNECT_PATH}/screen-2.png`,
    copy: <>Выберите подходящий профиль<br />и нажмите кнопку «Подключить»,<br />чтобы активировать его.</>,
    announcement: 'Выберите подходящий профиль и нажмите кнопку «Подключить».',
  },
  {
    screen: `${CONNECT_PATH}/app-screen.png`,
    copy: <>Готово! Профиль активируется сразу.<br />Управлять им можно в любое время<br />в Личном кабинете.</>,
    announcement: 'Профиль активирован. Управлять им можно в Личном кабинете.',
  },
] as const

const stepShapes = ['hexagon', 'circle', 'square'] as const
const connectSteps = baseConnectSteps.map((step, index) => ({
  ...step,
  shape: stepShapes[index % stepShapes.length],
}))

const closedQuestions = [
  <>Работает ли эта услуга<br />в моем регионе?</>,
  <>Как работает услуга?</>,
  <>Где посмотреть документы<br />и узнать больше об услуге?</>,
]

export function ConnectSection() {
  const cardRef = useRef<HTMLDivElement>(null)
  const goToRef = useRef<(page: number) => void>(() => undefined)
  const suppressControlClickRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [transitionPreviewIndex, setTransitionPreviewIndex] = useState<number | null>(null)

  useGSAP((_, contextSafe) => {
    const card = cardRef.current
    if (!card || !contextSafe) return

    const phoneSlides = gsap.utils.toArray<HTMLElement>('.connect-card__phone-slide', card)
    const stepIcons = gsap.utils.toArray<HTMLElement>('.connect-card__step', card)
    const copySlides = gsap.utils.toArray<HTMLElement>('.connect-card__copy-item', card)

    if (
      phoneSlides.length !== connectSteps.length
      || stepIcons.length !== connectSteps.length
      || copySlides.length !== connectSteps.length
    ) return

    const animatedTargets = [...phoneSlides, ...stepIcons, ...copySlides]

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let requestedIndex = 0
    let pendingIndex: number | null = null
    let activeEdge: {
      from: number
      to: number
      timeline: gsap.core.Timeline
    } | null = null
    let controlClickReset = 0
    let queuedTransitionFrame = 0
    let gesture: {
      source: 'pointer' | 'touch'
      id: number
      startX: number
      startY: number
      axis: 'x' | 'y' | null
      consumed: boolean
    } | null = null

    const wrapIndex = (index: number) => (
      ((index % connectSteps.length) + connectSteps.length) % connectSteps.length
    )

    const iconState = (index: number, page: number) => {
      const relativeIndex = wrapIndex(index - page)

      if (relativeIndex === 0) {
        return { x: 0, scale: 1, autoAlpha: 1, zIndex: VISIBLE_STEP_COUNT + 1 }
      }
      if (relativeIndex < VISIBLE_STEP_COUNT) {
        return {
          x: STEP_ICON_OFFSET * relativeIndex,
          scale: 1,
          autoAlpha: 1,
          zIndex: VISIBLE_STEP_COUNT + 1 - relativeIndex,
        }
      }
      return { x: 0, scale: 0.72, autoAlpha: 0, zIndex: 1 }
    }

    const setPage = (page: number) => {
      gsap.set(phoneSlides, {
        autoAlpha: (index: number) => (index === page ? 1 : 0),
        scale: (index: number) => (index === page ? 1 : PHONE_INACTIVE_SCALE),
        zIndex: (index: number) => (index === page ? 1 : 0),
      })
      gsap.set(copySlides, {
        autoAlpha: (index: number) => (index === page ? 1 : 0),
        zIndex: (index: number) => (index === page ? 1 : 0),
      })
      gsap.set(stepIcons, {
        x: (index: number) => iconState(index, page).x,
        scale: (index: number) => iconState(index, page).scale,
        autoAlpha: (index: number) => iconState(index, page).autoAlpha,
        zIndex: (index: number) => iconState(index, page).zIndex,
      })
    }

    let goTo: (requestedPage: number) => void = () => undefined

    const clearTransitionPreviews = () => {
      setTransitionPreviewIndex(null)
    }

    const settleEdge = (page: number) => {
      clearTransitionPreviews()
      setPage(page)
      gsap.set(animatedTargets, {
        clearProps: 'willChange',
      })
      activeEdge = null

      const queuedPage = pendingIndex
      pendingIndex = null
      if (queuedPage !== null && queuedPage !== page) {
        window.cancelAnimationFrame(queuedTransitionFrame)
        queuedTransitionFrame = window.requestAnimationFrame(() => {
          queuedTransitionFrame = 0
          goTo(queuedPage)
        })
      }
    }

    const buildEdgeTimeline = (fromPage: number, toPage: number) => {
      const leftIcon = stepIcons[fromPage]
      const promotedIcon = stepIcons[toPage]
      const shiftedIcon = stepIcons[wrapIndex(toPage + 1)]
      const futureIndex = wrapIndex(toPage + VISIBLE_STEP_COUNT - 1)
      const futureIcon = stepIcons[futureIndex]
      const recyclesLeftIcon = futureIcon === leftIcon

      clearTransitionPreviews()
      setTransitionPreviewIndex(futureIndex)

      const timeline = gsap.timeline({ paused: true })

      timeline
        .set(phoneSlides, {
          autoAlpha: (index: number) => (index === fromPage ? 1 : 0),
          scale: (index: number) => (
            index === fromPage ? 1 : PHONE_INACTIVE_SCALE
          ),
          zIndex: (index: number) => (
            index === toPage ? 2 : index === fromPage ? 1 : 0
          ),
        }, 0)
        .set(copySlides, {
          autoAlpha: (index: number) => (index === fromPage ? 1 : 0),
          zIndex: (index: number) => (
            index === toPage ? 2 : index === fromPage ? 1 : 0
          ),
        }, 0)
        .set(stepIcons, {
          x: (index: number) => iconState(index, fromPage).x,
          scale: (index: number) => iconState(index, fromPage).scale,
          autoAlpha: (index: number) => iconState(index, fromPage).autoAlpha,
          zIndex: (index: number) => iconState(index, fromPage).zIndex,
        }, 0)

      if (!recyclesLeftIcon) {
        timeline.set(futureIcon, {
          x: STEP_ICON_OFFSET * (VISIBLE_STEP_COUNT - 1),
          scale: 0.72,
          autoAlpha: 0,
          zIndex: 1,
        }, 0)
      }

      timeline
        .to(phoneSlides, {
          autoAlpha: (index: number) => (index === toPage ? 1 : 0),
          scale: (index: number) => (
            index === toPage ? 1 : PHONE_INACTIVE_SCALE
          ),
          duration: STEP_MOVE_DURATION,
          ease: 'power2.inOut',
        }, STEP_MOVE_START)
        .to(copySlides, {
          autoAlpha: (index: number) => (index === toPage ? 1 : 0),
          duration: STEP_MOVE_DURATION,
          ease: 'power2.inOut',
        }, STEP_MOVE_START)
        .to(leftIcon, {
          x: 0,
          scale: 0.72,
          autoAlpha: 0,
          duration: STEP_SHRINK_DURATION,
          ease: 'power2.inOut',
        }, 0)

      if (recyclesLeftIcon) {
        timeline
          .set(futureIcon, {
            x: STEP_ICON_OFFSET * (VISIBLE_STEP_COUNT - 1),
            scale: 0.72,
            autoAlpha: 0,
            zIndex: 1,
          }, STEP_MOVE_START)
          .call(clearTransitionPreviews, [], STEP_MOVE_START)
      }

      timeline
        .to(promotedIcon, {
          x: 0,
          scale: 1,
          autoAlpha: 1,
          duration: STEP_MOVE_DURATION,
          ease: 'power2.inOut',
        }, STEP_MOVE_START)
        .to(shiftedIcon, {
          x: STEP_ICON_OFFSET,
          scale: 1,
          autoAlpha: 1,
          duration: STEP_MOVE_DURATION,
          ease: 'power2.inOut',
        }, STEP_MOVE_START)
        .to(futureIcon, {
          x: STEP_ICON_OFFSET * (VISIBLE_STEP_COUNT - 1),
          scale: 1,
          autoAlpha: 1,
          duration: FUTURE_STEP_DURATION,
          ease: 'power3.out',
        }, FUTURE_STEP_DELAY)
        .set(promotedIcon, { zIndex: VISIBLE_STEP_COUNT + 1 }, STEP_EDGE_DURATION)
        .set(shiftedIcon, { zIndex: VISIBLE_STEP_COUNT }, STEP_EDGE_DURATION)
        .set(futureIcon, { zIndex: VISIBLE_STEP_COUNT - 1 }, STEP_EDGE_DURATION)

      if (!recyclesLeftIcon) {
        timeline.set(leftIcon, { zIndex: 1 }, STEP_EDGE_DURATION)
      }

      return timeline
    }

    goTo = contextSafe((requestedPage: number) => {
      const targetPage = wrapIndex(requestedPage)
      if (targetPage === requestedIndex) {
        pendingIndex = null
        return
      }

      if (activeEdge) {
        if (targetPage === activeEdge.from || targetPage === activeEdge.to) {
          pendingIndex = null
          requestedIndex = targetPage
          setActiveIndex(targetPage)

          if (targetPage === activeEdge.to) {
            clearTransitionPreviews()
            activeEdge.timeline.play()
          } else {
            const previewIndex = wrapIndex(
              activeEdge.to + VISIBLE_STEP_COUNT - 1,
            )
            if (activeEdge.timeline.time() > STEP_MOVE_START) {
              setTransitionPreviewIndex(previewIndex)
            } else {
              clearTransitionPreviews()
            }
            activeEdge.timeline.reverse()
          }
          return
        }

        pendingIndex = targetPage
        return
      }

      const previousPage = requestedIndex
      if (prefersReducedMotion) {
        requestedIndex = targetPage
        pendingIndex = null
        setActiveIndex(targetPage)
        setPage(targetPage)
        return
      }

      const forwardDistance = wrapIndex(targetPage - previousPage)
      const backwardDistance = wrapIndex(previousPage - targetPage)
      const movesForward = forwardDistance <= backwardDistance
      const nextPage = wrapIndex(previousPage + (movesForward ? 1 : -1))

      pendingIndex = nextPage === targetPage ? null : targetPage
      requestedIndex = nextPage
      setActiveIndex(nextPage)
      gsap.killTweensOf(animatedTargets)
      const edgeFrom = movesForward ? previousPage : nextPage
      const edgeTo = movesForward ? nextPage : previousPage
      const timeline = buildEdgeTimeline(edgeFrom, edgeTo)

      gsap.set(animatedTargets, {
        willChange: 'transform,opacity',
      })

      timeline.eventCallback('onComplete', () => settleEdge(edgeTo))
      timeline.eventCallback('onReverseComplete', () => settleEdge(edgeFrom))
      activeEdge = { from: edgeFrom, to: edgeTo, timeline }

      if (movesForward) {
        timeline.play(0)
      } else {
        timeline.progress(1, true).reverse()
      }
    })

    goToRef.current = goTo

    setPage(0)

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
          && !card.hasPointerCapture?.(id)
        ) {
          card.setPointerCapture?.(id)
        }
      }

      if (gesture.axis !== 'x') return

      if (event.cancelable) event.preventDefault()
      if (gesture.consumed || absoluteX < SWIPE_TRIGGER_THRESHOLD) return

      gesture.consumed = true
      suppressControlClickRef.current = true
      goTo(requestedIndex + (deltaX < 0 ? 1 : -1))
    }

    const prefersTouchEvents = 'ontouchstart' in window

    const resetControlClickAfterGesture = (wasConsumed: boolean) => {
      window.clearTimeout(controlClickReset)
      if (!wasConsumed) {
        suppressControlClickRef.current = false
        return
      }

      controlClickReset = window.setTimeout(() => {
        suppressControlClickRef.current = false
      }, 320)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.button !== 0
        || !event.isPrimary
        || (prefersTouchEvents && event.pointerType === 'touch')
      ) return

      window.clearTimeout(controlClickReset)
      suppressControlClickRef.current = false
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

      const wasConsumed = gesture.consumed

      if (event.type === 'pointerup') {
        updateGesture('pointer', event.pointerId, event.clientX, event.clientY, event)
      }

      if (card.hasPointerCapture?.(event.pointerId)) {
        card.releasePointerCapture(event.pointerId)
      }
      gesture = null
      resetControlClickAfterGesture(wasConsumed || suppressControlClickRef.current)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        gesture = null
        return
      }

      const touch = event.touches[0]
      window.clearTimeout(controlClickReset)
      suppressControlClickRef.current = false
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

      const touch = Array.from(event.touches).find(({ identifier }) => identifier === gesture?.id)
      if (!touch) return

      updateGesture('touch', touch.identifier, touch.clientX, touch.clientY, event)
    }

    const finishTouch = (event: TouchEvent) => {
      if (!gesture || gesture.source !== 'touch') return

      const wasConsumed = gesture.consumed

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
        resetControlClickAfterGesture(wasConsumed || suppressControlClickRef.current)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(requestedIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(requestedIndex + 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        goTo(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        goTo(connectSteps.length - 1)
      }
    }

    card.addEventListener('pointerdown', onPointerDown, { capture: true })
    card.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
    card.addEventListener('pointerup', finishPointer, { capture: true })
    card.addEventListener('pointercancel', finishPointer, { capture: true })
    card.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    card.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    card.addEventListener('touchend', finishTouch, { capture: true, passive: true })
    card.addEventListener('touchcancel', finishTouch, { capture: true, passive: true })
    card.addEventListener('keydown', onKeyDown)

    return () => {
      activeEdge?.timeline.kill()
      clearTransitionPreviews()
      window.clearTimeout(controlClickReset)
      window.cancelAnimationFrame(queuedTransitionFrame)
      goToRef.current = () => undefined
      suppressControlClickRef.current = false
      card.removeEventListener('pointerdown', onPointerDown, true)
      card.removeEventListener('pointermove', onPointerMove, true)
      card.removeEventListener('pointerup', finishPointer, true)
      card.removeEventListener('pointercancel', finishPointer, true)
      card.removeEventListener('touchstart', onTouchStart, true)
      card.removeEventListener('touchmove', onTouchMove, true)
      card.removeEventListener('touchend', finishTouch, true)
      card.removeEventListener('touchcancel', finishTouch, true)
      card.removeEventListener('keydown', onKeyDown)
    }
  }, { scope: cardRef })

  const selectStep = (index: number) => {
    if (suppressControlClickRef.current) return
    goToRef.current(index)
  }

  return (
    <section className="support-section" aria-labelledby="connect-title">
      <h2 id="connect-title" className="connect-title">Как подключить</h2>
      <h3 className="connect-audience-title">Для абонентов МегаФона</h3>

      <div
        ref={cardRef}
        className="connect-card"
        role="region"
        aria-roledescription="карусель"
        aria-label={`Как подключить: шаг ${activeIndex + 1} из ${connectSteps.length}`}
        tabIndex={0}
      >
        <span className="visually-hidden" aria-live="polite" aria-atomic="true">
          Шаг {activeIndex + 1} из {connectSteps.length}. {connectSteps[activeIndex].announcement}
        </span>

        <div className="connect-card__picture" aria-hidden="true">
          {connectSteps.map((step, index) => (
            <div className="connect-card__phone-slide" key={`${step.screen}-${index}`}>
              <div className="connect-card__screen-viewport">
                <img
                  className="connect-card__screen"
                  src={step.screen}
                  alt=""
                  width="236"
                  height="509"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </div>
              <img
                className="connect-card__bezel"
                src={`${CONNECT_PATH}/phone-bezel.webp`}
                alt=""
                width="400"
                height="813"
                loading="lazy"
                draggable="false"
              />
            </div>
          ))}
        </div>

        <div className="connect-card__stepper" role="group" aria-label="Шаги подключения">
          {connectSteps.map((step, index) => {
            const relativeIndex = (
              (index - activeIndex + connectSteps.length) % connectSteps.length
            )
            const nextClass = relativeIndex > 0 && relativeIndex < VISIBLE_STEP_COUNT
              ? ` is-next is-next--${relativeIndex}`
              : ''

            return (
              <button
                type="button"
                className={`connect-card__step${
                  relativeIndex === 0 ? ' is-active' : nextClass
                }${index === transitionPreviewIndex ? ' is-transition-preview' : ''}`}
                aria-label={`Перейти к шагу ${index + 1}`}
                aria-current={index === activeIndex ? 'step' : undefined}
                onClick={() => selectStep(index)}
                key={index}
              >
                <i
                  className={`connect-card__step-shape connect-card__step-shape--${step.shape}`}
                  aria-hidden="true"
                />
                <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
              </button>
            )
          })}
        </div>

        <div className="connect-card__copy">
          {connectSteps.map((step, index) => (
            <p className="connect-card__copy-item" key={index}>{step.copy}</p>
          ))}
        </div>

        <div className="connect-card__pagination" role="group" aria-label="Пагинация шагов">
          {connectSteps.map((_, index) => (
            <button
              type="button"
              className={index === activeIndex ? 'is-active' : undefined}
              aria-label={`Перейти к шагу ${index + 1}`}
              aria-current={index === activeIndex ? 'step' : undefined}
              onClick={() => selectStep(index)}
              key={index}
            />
          ))}
        </div>
      </div>

      <NewSubscriberSection />

      <section className="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Остались вопросы?</h2>

        <div className="faq__list">
          <article className="faq-card faq-card--open">
            <header>
              <h3>Что такое 5G режим?</h3>
              <img src={`${CONNECT_PATH}/faq-up.svg`} alt="" width="30" height="30" />
            </header>
            <p>«5G режим» — это специальная услуга мобильной связи, которая дает доступ к сетям пятого поколения, а в зонах без покрытия 5G автоматически включает оптимизированные настройки, ускоряя передачу данных до 60%</p>
          </article>

          {closedQuestions.map((question, index) => (
            <article className="faq-card faq-card--closed" key={index}>
              <h3>{question}</h3>
              <img src={`${CONNECT_PATH}/faq-down.svg`} alt="" width="30" height="30" />
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
