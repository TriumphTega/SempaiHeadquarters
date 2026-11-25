// www.sempaihq.com/support — contact the team.
import SiteShell, { Aura } from "../../components/site/SiteShell";
import { Reveal } from "../../components/site/Motion";
import { X_URL, APP } from "../../components/site/links";
import SupportForm from "./SupportForm";

export const metadata = { title: "Support — Sempai HQ", description: "Get help with Sempai HQ." };

export default function Support() {
  return (
    <SiteShell>
      <section className="sx-page-hero" style={{ paddingBottom: 30 }}>
        <Aura />
        <div className="sx-wrap" style={{ position: "relative" }}>
          <Reveal><span className="sx-eyebrow">Support</span></Reveal>
          <Reveal delay={80}><h1 className="sx-display">How can we <span className="sx-grad">help?</span></h1></Reveal>
          <Reveal delay={160}><p className="sx-lead" style={{ margin: "20px auto 0" }}>Send us a message and the team will get back to you by email. For quick questions, reach us on X.</p></Reveal>
        </div>
      </section>
      <section style={{ paddingBottom: 80 }}>
        <div className="sx-wrap" style={{ maxWidth: 760 }}>
          <Reveal delay={120}><div className="sx-card" style={{ padding: 30 }}><SupportForm /></div></Reveal>
          <Reveal delay={200}>
            <p style={{ textAlign: "center", color: "var(--ink3)", marginTop: 22 }}>
              Also on X: <a href={X_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 800 }}>@HomeforSempai</a> · In the app: <a href={`${APP}/chat`} style={{ color: "var(--accent)", fontWeight: 800 }}>Community chat</a>
            </p>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
