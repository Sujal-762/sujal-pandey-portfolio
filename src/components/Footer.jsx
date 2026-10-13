import { ArrowUp } from "lucide-react";
import { profile } from "../content/site.js";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__id">
          <span className="brand__mark" aria-hidden="true">SP</span>
          <p>© <span suppressHydrationWarning>{new Date().getFullYear()}</span> {profile.name}. Student portfolio.</p>
        </div>
        <p className="footer__small">
          Independent personal site; not affiliated with or endorsed by {profile.institution}. Visuals are original
          illustrations — they do not depict real evidence, people or cases.
        </p>
        <a className="footer__top" href="/">
          Home <ArrowUp size={14} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
