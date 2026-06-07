interface HeroProps {
  title: string
  subtitle?: string
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section style={{
      padding: "8rem 2rem",
      textAlign: "center",
      background: "linear-gradient(135deg, var(--skafform-background) 0%, var(--skafform-muted) 100%)",
    }}>
      <h1 style={{
        fontSize: "3.5rem",
        fontWeight: "800",
        marginBottom: "1.5rem",
        color: "var(--skafform-primary)",
        fontFamily: "var(--skafform-font-heading)",
        letterSpacing: "-0.02em",
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontSize: "1.25rem",
          color: "var(--skafform-muted-fg)",
          maxWidth: "560px",
          margin: "0 auto",
          fontFamily: "var(--skafform-font)",
        }}>
          {subtitle}
        </p>
      )}
    </section>
  )
}
