import { publicAsset } from '../publicAsset'

const FOOTER_PATH = publicAsset('assets/footer')

const navigation = ['Связь', 'Услуги и опции', 'Развлечения', 'Поддержка', 'Интернет‑магазин', 'Самозанятым', 'Бизнесу', 'О компании']
const socialIcons = ['social-vk.svg', 'social-ok.svg', 'social-youtube.svg', 'social-service.svg', 'social-telegram.svg']

function StoreIcon({ platform }: { platform: 'ios' | 'android' }) {
  const layers = platform === 'ios'
    ? ['ios-1.svg', 'ios-3.svg', 'ios-2.svg']
    : ['android-1.svg', 'android-2.svg', 'android-3.svg', 'android-4.svg']

  return (
    <span className={`store-icon store-icon--${platform}`} aria-hidden="true">
      {layers.map((layer) => <img key={layer} src={`${FOOTER_PATH}/${layer}`} alt="" />)}
    </span>
  )
}

export function FooterSection() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <nav className="footer-nav" aria-label="Разделы сайта">
          {navigation.map((item) => (
            <div className="footer-nav__item" key={item}>
              <span>{item}</span>
              <img src={`${FOOTER_PATH}/chevron.svg`} alt="" width="32" height="32" />
            </div>
          ))}
        </nav>

        <section className="footer-app" aria-labelledby="footer-app-title">
          <h2 id="footer-app-title">Приложение «МегаФон»</h2>
          <div className="footer-app__stores">
            <div className="footer-app__buttons">
              <div><StoreIcon platform="ios" /><span>iOS</span></div>
              <div><StoreIcon platform="android" /><span>Android</span></div>
            </div>
            <img className="footer-app__qr" src={`${FOOTER_PATH}/qr.png`} alt="QR-код для установки приложения" width="83" height="116" />
          </div>
          <div className="footer-app__links">
            <div>Оцените наш сайт</div>
            <div>Работа в МегаФоне</div>
          </div>
        </section>
      </div>

      <div className="footer-info">
        <div className="footer-promo">
          <img src={`${FOOTER_PATH}/gift.png`} alt="" width="64" height="64" />
          <p>Делимся скидками и<br />предложениями</p>
          <span><img src={`${FOOTER_PATH}/promo-action.svg`} alt="" /></span>
        </div>

        <div className="footer-privacy">
          <span className="footer-privacy__age">6+</span>
          <div>
            <p>Продолжая использовать наш сайт, вы даете согласие на обработку файлов Cookies и других пользовательских данных, в соответствии с <a href="#privacy">Политикой конфиденциальности</a></p>
            <a id="privacy" href="#privacy">Политика в отношении обработки персональных данных ПАО «МегаФон»</a>
          </div>
        </div>
      </div>

      <div className="footer-legal">
        <div className="footer-copyright">
          <img src={`${FOOTER_PATH}/copyright-mark.png`} alt="" width="24" height="24" />
          <span>© 2026 ПАО «МегаФон»</span>
        </div>
        <div className="footer-legal__links"><span>Условия оказания услуг</span><span>Лицензии</span></div>
        <div className="footer-socials">
          {socialIcons.map((icon) => <img key={icon} src={`${FOOTER_PATH}/${icon}`} alt="" width="32" height="32" />)}
          <img className="footer-socials__coverage" src={`${FOOTER_PATH}/coverage.png`} alt="Самое широкое покрытие" width="100" height="32" />
        </div>
      </div>
    </footer>
  )
}
