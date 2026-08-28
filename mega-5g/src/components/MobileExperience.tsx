import { ConnectSection } from './ConnectSection'
import { DetailsSection } from './DetailsSection'
import { FooterSection } from './FooterSection'
import { ProductsSection } from './ProductsSection'
import { PromoSection } from './PromoSection'
import { publicAsset } from '../publicAsset'

export function MobileExperience() {
  return (
    <main id="top" className="mobile-experience">
      <header className="mobile-header">
        <div className="mobile-header__rail">
          <a className="mobile-header__brand" href="#top" aria-label="МегаФон — в начало страницы">
            <img className="mobile-header__brand-mark" src={publicAsset('assets/promo/header-logo-mark.svg')} alt="" width="24" height="24" />
            <img className="mobile-header__brand-wordmark" src={publicAsset('assets/promo/header-logo-wordmark.svg')} alt="" width="103" height="14" />
          </a>

          <div className="mobile-header__actions">
            <button className="mobile-header__login" type="button">Войти</button>
            <button className="mobile-header__menu" type="button" aria-label="Открыть меню">
              <img src={publicAsset('assets/promo/menu.svg')} alt="" width="32" height="32" />
            </button>
          </div>
        </div>
      </header>

      <div className="hero-scene">
        <PromoSection />
        <DetailsSection />
      </div>
      <ProductsSection />
      <ConnectSection />
      <FooterSection />
      <div className="page-tail" aria-hidden="true" />
    </main>
  )
}
