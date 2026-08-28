const TARIFF_PLACEHOLDERS = 4

export function TariffsSection() {
  return (
    <section id="tariffs" className="tariffs" aria-labelledby="tariffs-title">
      <h2 id="tariffs-title" className="tariffs__title">Тарифы с Мега 5G</h2>

      <div className="tariffs__viewport" aria-label="Тарифы с Мега 5G" tabIndex={0}>
        <div className="tariffs__track">
          {Array.from({ length: TARIFF_PLACEHOLDERS }, (_, index) => (
            <div
              className="tariffs__placeholder"
              data-tariff-embed-placeholder
              aria-hidden="true"
              key={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
