export function NewSubscriberSection() {
  return (
    <section className="new-subscriber" aria-labelledby="new-subscriber-title">
      <div className="new-subscriber-card">
        <p className="new-subscriber-card__eyebrow">Мега 5G с новым номером</p>
        <h3 id="new-subscriber-title">Для новых абонентов</h3>
        <p className="new-subscriber-card__copy">
          Подключитесь к МегаФону и выберите профиль Мега 5G под свой ритм жизни.
        </p>
        <div className="new-subscriber-card__actions" aria-label="Подключение новых абонентов">
          <button className="new-subscriber-card__action new-subscriber-card__action--sim" type="button">
            Купить новую SIM
          </button>
          <button className="new-subscriber-card__action new-subscriber-card__action--mnp" type="button">
            Перейти со своим номером
          </button>
        </div>
      </div>
    </section>
  )
}
