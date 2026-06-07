import config from "virtual:skafform/config"

export default function About() {
  return (
    <section style={{
      padding: "4rem 2rem",
      maxWidth: "640px",
      margin: "2rem auto",
      background: "var(--skafform-background)",
      border: "1px solid var(--skafform-border)",
      borderRadius: "var(--skafform-radius-lg)",
      fontFamily: "var(--skafform-font)",
    }}>
      <h1 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "1rem",
        color: "var(--skafform-primary)",
        fontFamily: "var(--skafform-font-heading)",
      }}>About</h1>
      <p style={{ color: "var(--skafform-muted-fg)", lineHeight: 1.7 }}>
        Cette page vient du thème <strong>theme-light</strong>.
        Thème actif : <code>{(config as any).theme}</code>.
      </p>
    </section>
  )
}
