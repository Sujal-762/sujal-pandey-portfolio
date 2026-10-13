import { MotionConfig } from "motion/react";

import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import CaseStudyPage from "./pages/CaseStudyPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import { matchRoute } from "./lib/routes.js";
import { skipIntro } from "./journey/useJourney.js";

export default function App({ path }) {
  const route = matchRoute(path);
  const onHome = route.page === "home";

  return (
    // reducedMotion="user": Motion drops transform animations for visitors who ask for less motion.
    <MotionConfig reducedMotion="user">
      {onHome && (
        <a className="skip-link" href="#evidence" onClick={(e) => { e.preventDefault(); skipIntro(); }}>Skip intro</a>
      )}
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav onHome={onHome} />
      {route.page === "home" && <Home />}
      {route.page === "archive" && <ArchivePage />}
      {route.page === "case" && <CaseStudyPage caseStudy={route.caseStudy} />}
      {route.page === "notfound" && <NotFound />}
      {!onHome && <Footer />}
    </MotionConfig>
  );
}
