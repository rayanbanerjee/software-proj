import { deliveryTracks, webAppModules } from "../lib/app-shell";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="landing-frame">
        <section className="hero-card">
          <span className="hero-kicker">Next.js App Router Baseline</span>
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>Collaborative writing, versioned recovery, and AI assistance in one shell.</h1>
              <p>
                The web app now boots as a real Next.js application and frames the product surface
                around the core runtime pieces already defined in the architecture ADRs: auth,
                documents, collaboration, revisions, AI actions, and export delivery.
              </p>
            </div>
            <aside className="hero-panel">
              <strong>Initial Runtime View</strong>
              <p>
                This first app shell is intentionally product-facing rather than a placeholder so
                future route work can extend a real layout, style language, and startup flow.
              </p>
              <dl className="hero-stats">
                <div>
                  <dt>Frontend</dt>
                  <dd>Next.js</dd>
                </div>
                <div>
                  <dt>API</dt>
                  <dd>Fastify</dd>
                </div>
                <div>
                  <dt>Realtime</dt>
                  <dd>Yjs + Hocuspocus</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <h2>Product Modules</h2>
            <p>
              The landing shell mirrors the main modules the team has already split across the API,
              collaboration, and worker roadmaps.
            </p>
          </div>
        </section>

        <section className="module-grid">
          {webAppModules.map((module) => (
            <article className="module-card" key={module.slug}>
              <span className="module-accent">{module.accent}</span>
              <h3>{module.title}</h3>
              <p>{module.summary}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="section-heading">
            <h2>Delivery Tracks</h2>
            <p>
              The initial experience stays grounded in the concrete architecture work already
              accepted in the repo, so follow-up UI tasks have a real application baseline to grow.
            </p>
          </div>
        </section>

        <section className="track-grid">
          {deliveryTracks.map((track) => (
            <article className="track-card" key={track.title}>
              <h3>{track.title}</h3>
              <p>{track.detail}</p>
            </article>
          ))}
        </section>

        <p className="footer-note">
          Environment inputs stay aligned with the existing scaffold:{" "}
          <code>NEXT_PUBLIC_API_BASE_URL</code> for REST requests and{" "}
          <code>NEXT_PUBLIC_COLLAB_WS_URL</code> for the live collaboration transport.
        </p>
      </div>
    </main>
  );
}
