import { Braces, Code2, Hammer, MessageSquareText, Swords, Timer, Wrench } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";

export default function MethodologyPage() {
  return (
    <>
      <SiteNav />
      <main className="method-page page-pad">
        <section className="method-hero focused">
          <div>
            <p className="eyebrow">Benchmark methodology</p>
            <h1>How Chess<span className="brand-bench">Bench</span> evaluates model-built engines</h1>
            <p>
              Each model is evaluated as an autonomous coding agent. It receives the same chess-engine objective, the
              same tool interface, and the same turn budget, then its compiled engine is tested through actual games.
            </p>
          </div>
        </section>

        <section className="prompt-panel">
          <div>
            <p className="eyebrow">System prompt</p>
            <h2>Build the strongest chess engine you can.</h2>
            <p>
              The prompt requires a C++ UCI engine that compiles with `make`, handles standard UCI commands, supports
              timer-based play, and iterates by writing code, compiling, and fixing errors before the tool-call budget
              expires.
            </p>
          </div>
          <pre>{`Build the strongest chess engine you can.

The only requirements are that the engine is written in C++, uses the UCI protocol, and compiles successfully using \`make\` in the current run directory.

Use the provided tools to read and write files and compile code. Tools will not execute if not called with the right syntax, make sure to use the correct syntax.

Iterate by writing code, compiling it, and fixing any errors until you have a working engine or you reach the tool call limit ({max_turns} turns). Make sure your code compiles before you lose access to tools.

Make sure the engine supports enough UCI commands to fully play against other engines in any traditional time control: handle \`uci\`, \`isready\`, \`ucinewgame\`, \`position\`, \`go\`, and \`quit\`.

Games will be facilitated with timer controls, so make sure to base time management on go's parameters and allocate time accordingly throughout the game.

Your goal is to create the highest ELO chess engine you can to beat out the competition.`}</pre>
        </section>

        <section className="method-grid">
          <MethodCard
            icon={<MessageSquareText />}
            title="Same context"
            body="Every run starts with the same system prompt and a direct user request to generate the engine, write source files, compile, and fix build errors."
          />
          <MethodCard
            icon={<Wrench />}
            title="Tool calling"
            body="Agents can read files, write files, and invoke the compile tool inside an isolated generation workspace. They do not get arbitrary shell access."
          />
          <MethodCard
            icon={<Timer />}
            title="Turn budget"
            body="Runs are bounded by a maximum number of model/tool turns. If the model has not produced a compiling UCI engine by then, that run is not tournament-ready."
          />
          <MethodCard
            icon={<Hammer />}
            title="Compile gate"
            body="The generated project must include a root Makefile and pass compilation. The stored manifest records provider, model, run id, turns, status, and compile result."
          />
          <MethodCard
            icon={<Swords />}
            title="Round-robin games"
            body="Compiled engines are discovered offline and paired in a persistent competition runner. Moves are validated with python-chess and every move, clock, PGN, and error is stored."
          />
          <MethodCard
            icon={<Braces />}
            title="Rating calculation"
            body="The leaderboard is built from head-to-head game results using the project ELO estimator, with optional anchor ratings for future calibration."
          />
        </section>

        <section className="schema-callout">
          <div>
            <p className="eyebrow">Important interpretation</p>
            <h2>This is not a chess model benchmark.</h2>
            <p>
              ChessBench measures whether a model can implement a strong chess engine under agentic coding constraints.
              The game results evaluate the generated program, not the base model playing chess directly.
            </p>
          </div>
          <Code2 size={40} />
        </section>
      </main>
    </>
  );
}

function MethodCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="method-card">
      <div className="signal-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}
