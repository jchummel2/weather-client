export function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="launch-screen">
      <section className="launch-panel" role="alert">
        <p className="eyebrow">Weatherly service</p>
        <h1>Unable to load weather.</h1>
        <p className="launch-message">{message}</p>
      </section>
    </main>
  );
}