import { useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { Heading } from "../components/ui.tsx";

export const AboutView = () => {
  useViewFocus("about");
  return (
    <>
      <Heading>Acknowledgements 💜</Heading>

      <section className="card greet">
        <Mascot mood="cheer" size={70} />
        <div className="bubble">Thanks for revising with me! Good luck in your Part 1 test. 🍀</div>
      </section>

      <section className="card">
        <h2>Created by</h2>
        <p className="m0">
          <strong>Dr Brandon Charles Seychell</strong>, your biochemistry lecturer. The summaries, questions and flashcards follow the
          course syllabus and his lecture slides.
        </p>
      </section>

      <section className="card">
        <h2>Made with AI 🤖</h2>
        <p>
          To be transparent: this app was built with the help of <strong>Claude Code</strong>, an AI coding assistant made by Anthropic.
          Dr Seychell planned the app, wrote the lecture material it is based on, and checks the content.
        </p>
        <p className="m0">
          AI can still make mistakes. If something doesn't match your notes, trust your notes and let Dr Seychell know.
        </p>
      </section>

      <section className="card">
        <h2>Suggestions and improvements 💡</h2>
        <p>
          Spotted a mistake, or have an idea to make the app better? Please tell Dr Seychell directly, in class or through your usual
          course contact.
        </p>
        <p className="small muted m0">Tip: after answering a question, “Report a problem” shows its ID, so you can say exactly which one.</p>
      </section>

      <section className="card">
        <h2>Your privacy 🔒</h2>
        <p className="m0">
          There are no accounts and no tracking. Your progress is saved only on this device and is never sent anywhere.
        </p>
      </section>

      <p className="small muted center-text">{`Content updated ${__BUILD_DATE__}`}</p>
    </>
  );
};
