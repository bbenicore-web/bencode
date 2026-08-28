import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { publicAsset } from '../publicAsset'

const PRODUCT_PATH = publicAsset('assets/products')
const PRODUCT_PLACEHOLDER = `${PRODUCT_PATH}/profile-kino.webp`
const FIRST_STACK_START = 0.12
const STACK_INTERVAL = 0.78
const STACK_DURATION = 0.5
const CONTENT_FADE_OFFSET = 0.32
const STACK_STEP = 8
const STACKED_CARD_SCALE = 331 / 351
const STACK_SCALE_STEP = 20 / 351
const VISUAL_SWITCH_FORWARD_OVERLAP = 0
const VISUAL_SWITCH_REVERSE_OVERLAP = 0.5
const VISUAL_OUT_SCALE = 0.86
const VISUAL_IN_SCALE = 1.08

gsap.registerPlugin(useGSAP, ScrollTrigger)

const profiles = [
  {
    id: 'cinema',
    title: 'Кино',
    description: <>Фильмы и сериалы без пауз<br />и в высоком качестве</>,
    chips: ['Ускорение 60%', 'START', '+20 ГБ', 'Видео до 4K', 'Без ожидания'],
  },
  {
    id: 'city',
    title: 'Город',
    description: <>Настройки интернета<br />для активных горожан</>,
    chips: ['Ускорение 60%', 'Whoosh', '+25 ГБ', 'Безлимит на самокаты и карты'],
  },
  {
    id: 'boost',
    title: 'Ускорение',
    description: <>Высокая скорость интернета,<br />даже когда сеть перегружена</>,
    chips: ['Ускорение 60%', '100% ускорение на 3 часа'],
  },
  {
    id: 'cinema-extra',
    title: 'Кино',
    description: <>Фильмы и сериалы без пауз<br />и в высоком качестве</>,
    chips: ['Ускорение 60%', 'START', '+20 ГБ', 'Видео до 4K', 'Без ожидания'],
  },
]

const stackStarts = profiles.slice(1).map((_, index) => (
  FIRST_STACK_START + index * STACK_INTERVAL
))

export function ProductsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const visualFrameRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    const visual = visualRef.current
    const visualFrame = visualFrameRef.current
    const cardsContainer = cardsRef.current

    if (!section || !visual || !visualFrame || !cardsContainer) return

    const cards = gsap.utils.toArray<HTMLElement>('.profile-card', cardsContainer)
    const cardBackgrounds = gsap.utils.toArray<HTMLElement>('.profile-card__background', cardsContainer)

    if (
      cards.length !== profiles.length
      || cardBackgrounds.length !== profiles.length
    ) return

    const cardContents = cards.map((card) => (
      gsap.utils.toArray<HTMLElement>('.profile-card__top, .profile-card__bottom', card)
    ))

    const media = gsap.matchMedia()

    media.add(
      '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
      () => {
        const entranceLine = window.innerHeight * 0.88

        if (visual.getBoundingClientRect().top > entranceLine) {
          gsap.fromTo(
            visual,
            {
              autoAlpha: 0,
              y: 28,
              scale: 0.92,
              transformOrigin: '50% 50%',
              willChange: 'transform,opacity',
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility,willChange',
              scrollTrigger: {
                trigger: visual,
                start: 'top 88%',
                toggleActions: 'play none none none',
                once: true,
              },
            },
          )
        } else {
          gsap.set(visual, { clearProps: 'transform,opacity,visibility,willChange' })
        }

        gsap.set(cards, {
          transformOrigin: '50% 0%',
        })
        gsap.set(cards.slice(2), { autoAlpha: 0 })

        let requestedVisualIndex = 0
        let renderedVisualIndex = 0
        let transitionToken = 0
        let visualAnimation: gsap.core.Animation | null = null
        const commitVisual = (index: number) => {
          visualFrame.dataset.visualStep = String(index + 1)
          renderedVisualIndex = index
        }

        const showVisual = (nextIndex: number, immediate = false) => {
          if (!immediate && nextIndex === requestedVisualIndex) return

          requestedVisualIndex = nextIndex
          const token = ++transitionToken

          visualAnimation?.kill()
          gsap.killTweensOf(visualFrame)

          if (immediate) {
            commitVisual(nextIndex)
            gsap.set(visualFrame, {
              clearProps: 'transform,opacity,visibility,willChange',
            })
            return
          }

          gsap.set(visualFrame, { willChange: 'transform,opacity' })

          if (nextIndex === renderedVisualIndex) {
            visualAnimation = gsap.to(visualFrame, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.24,
              ease: 'power2.out',
              overwrite: 'auto',
              onComplete: () => {
                if (token !== transitionToken) return
                gsap.set(visualFrame, {
                  clearProps: 'transform,opacity,visibility,willChange',
                })
                visualAnimation = null
              },
            })
            return
          }

          visualAnimation = gsap.timeline({
            onComplete: () => {
              if (token !== transitionToken) return
              gsap.set(visualFrame, {
                clearProps: 'transform,opacity,visibility,willChange',
              })
              visualAnimation = null
            },
          })
            .to(visualFrame, {
              autoAlpha: 0,
              scale: VISUAL_OUT_SCALE,
              duration: 0.28,
              ease: 'power2.in',
            })
            .call(() => {
              if (token === transitionToken) commitVisual(nextIndex)
            })
            .set(visualFrame, { autoAlpha: 0, scale: VISUAL_IN_SCALE })
            .to(visualFrame, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.52,
              ease: 'power3.out',
            })
        }

        const cardDistance = (index: number) => cards[index].offsetTop - cards[0].offsetTop
        let visualEnterTimes: number[] = []
        let visualReturnTimes: number[] = []
        let lastVisualTimelineTime = 0
        let syncVisual: (immediate?: boolean) => void = () => undefined

        const switchTimeAtOverlap = (
          incomingIndex: number,
          previousIndex: number,
          segmentStart: number,
          overlap: number,
        ) => {
          const distance = cardDistance(incomingIndex)
          const previousHeight = cards[previousIndex].offsetHeight
          const targetTopGap = previousHeight * (1 - overlap)
          const scaledHeightCompensation = targetTopGap * (1 - STACKED_CARD_SCALE)
          const relativeTravel = Math.max(
            1,
            distance - STACK_STEP - scaledHeightCompensation,
          )
          const segmentProgress = gsap.utils.clamp(
            0,
            1,
            (distance - targetTopGap) / relativeTravel,
          )

          return segmentStart + STACK_DURATION * segmentProgress
        }

        const updateVisualSwitchTimes = () => {
          visualEnterTimes = stackStarts.map((segmentStart, index) => (
            switchTimeAtOverlap(
              index + 1,
              index,
              segmentStart,
              VISUAL_SWITCH_FORWARD_OVERLAP,
            )
          ))
          visualReturnTimes = stackStarts.map((segmentStart, index) => (
            switchTimeAtOverlap(
              index + 1,
              index,
              segmentStart,
              VISUAL_SWITCH_REVERSE_OVERLAP,
            )
          ))
        }

        updateVisualSwitchTimes()

        const stackTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top+=56px',
            end: 'bottom bottom',
            scrub: 0.25,
            invalidateOnRefresh: true,
            onRefresh: () => {
              updateVisualSwitchTimes()
              syncVisual(true)
            },
          },
        })

        const stackedScale = (depth: number) => Math.max(
          0.75,
          1 - STACK_SCALE_STEP * depth,
        )
        const stackedBackgroundOpacity = (depth: number) => (
          depth === 1 ? 0.8 : depth === 2 ? 0.3 : 0.14
        )

        stackStarts.forEach((segmentStart, transitionIndex) => {
          const incomingIndex = transitionIndex + 1

          for (let cardIndex = 0; cardIndex < incomingIndex; cardIndex += 1) {
            const depth = incomingIndex - cardIndex
            const restingY = cardIndex === 0 ? 0 : -cardDistance(cardIndex)

            stackTimeline
              .to(
                cards[cardIndex],
                {
                  y: () => restingY - STACK_STEP * depth,
                  scale: stackedScale(depth),
                  duration: STACK_DURATION,
                  ease: 'none',
                },
                segmentStart,
              )
              .to(
                cardBackgrounds[cardIndex],
                {
                  opacity: stackedBackgroundOpacity(depth),
                  duration: STACK_DURATION,
                  ease: 'none',
                },
                segmentStart,
              )
          }

          stackTimeline
            .to(
              cards[incomingIndex],
              { y: () => -cardDistance(incomingIndex), duration: STACK_DURATION, ease: 'none' },
              segmentStart,
            )
            .to(
              cardContents[incomingIndex - 1],
              { autoAlpha: 0, duration: 0.18, ease: 'none' },
              segmentStart + CONTENT_FADE_OFFSET,
            )

          const followingIndex = incomingIndex + 1
          if (followingIndex < cards.length) {
            stackTimeline.set(
              cards[followingIndex],
              { autoAlpha: 1 },
              segmentStart + STACK_DURATION,
            )
          }
        })

        syncVisual = (immediate = false) => {
          const timelineTime = stackTimeline.time()

          if (immediate) {
            let initialIndex = 0
            while (
              initialIndex < visualReturnTimes.length
              && timelineTime >= visualReturnTimes[initialIndex]
            ) {
              initialIndex += 1
            }

            lastVisualTimelineTime = timelineTime
            showVisual(initialIndex, true)
            return
          }

          const isMovingForward = timelineTime >= lastVisualTimelineTime
          let nextIndex = requestedVisualIndex

          if (isMovingForward) {
            while (
              nextIndex < visualEnterTimes.length
              && timelineTime >= visualEnterTimes[nextIndex]
            ) {
              nextIndex += 1
            }
          } else {
            while (
              nextIndex > 0
              && timelineTime <= visualReturnTimes[nextIndex - 1]
            ) {
              nextIndex -= 1
            }
          }

          lastVisualTimelineTime = timelineTime
          showVisual(nextIndex, immediate)
        }

        stackTimeline.eventCallback('onUpdate', () => syncVisual())
        syncVisual(true)

        return () => {
          stackTimeline.eventCallback('onUpdate', null)
          ++transitionToken
          visualAnimation?.kill()
          gsap.killTweensOf(visualFrame)
          gsap.set(visualFrame, { clearProps: 'transform,opacity,visibility,willChange' })
          commitVisual(0)
        }
      },
    )

    return () => {
      media.revert()
    }
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} id="profiles" className="products" aria-labelledby="products-title">
      <div className="products__stage">
        <div className="products__content">
          <h2 id="products-title" className="products__title">Выберите свой Мега 5G</h2>

          <div ref={visualRef} className="products__visual" aria-hidden="true">
            <div ref={visualFrameRef} className="products__visual-frame" data-visual-step="1">
              <img
                className="products__visual-image"
                src={PRODUCT_PLACEHOLDER}
                alt=""
                width="2560"
                height="1440"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <div ref={cardsRef} className="products__cards">
            {profiles.map((profile) => (
              <article className="profile-card" key={profile.id}>
                <div className="profile-card__background" aria-hidden="true" />

                <div className="profile-card__top">
                  <div>
                    <h3>{profile.title}</h3>
                    <p>{profile.description}</p>
                  </div>
                  <span className="profile-card__period">на 30 дней</span>
                </div>

                <div className="profile-card__bottom">
                  <div className="profile-card__chips">
                    {profile.chips.map((chip) => <span key={chip}>{chip}</span>)}
                  </div>
                  <button type="button" aria-label={`Выбрать профиль «${profile.title}»`}>
                    <img src={`${PRODUCT_PATH}/add-static.svg`} alt="" width="44" height="44" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
