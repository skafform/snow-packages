import Hero from "../components/Hero"
import config from "virtual:skafform/config"

export default function Home() {
  const hero = (config as any).customize?.hero ?? {}
  return <Hero title={hero.title ?? "Bienvenue"} subtitle={hero.subtitle} />
}
