import { MobileExperience } from './components/MobileExperience'
import { publicAsset } from './publicAsset'

function DesktopGate() {
  return (
    <main className="desktop-gate">
      <img
        className="desktop-gate__logo"
        src={publicAsset('assets/promo/megafon-logo.svg')}
        alt="МегаФон"
        width="169"
        height="30"
      />

      <div className="desktop-gate__phone" aria-hidden="true">
        <span />
      </div>

      <div className="desktop-gate__copy">
        <p className="desktop-gate__eyebrow">Мобильное демо</p>
        <h1>Откройте страницу на смартфоне</h1>
        <p>Или сузьте окно браузера — макет доступен на экранах до 767 px.</p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <>
      <MobileExperience />
      <DesktopGate />
    </>
  )
}
