import './App.css'
import { architectureModules } from './modules'

function App() {
  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Phase 1 Scaffold</p>
        <h1>Rookys Platform Foundation</h1>
        <p>
          The project is scaffolded with variant-ready module boundaries and CI/deploy
          rails.
        </p>
      </header>

      <section className="card">
        <h2>Module Boundaries</h2>
        <ul>
          {architectureModules.map((module) => (
            <li key={module.name}>
              <strong>{module.name}</strong>
              <span>{module.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
