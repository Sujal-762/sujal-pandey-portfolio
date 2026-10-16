import { Component, Suspense, lazy, useEffect, useState } from "react";
import { useJourney } from "../journey/useJourney.js";
import {
  RoomChapter, EvidenceChapter, TransformChapter, ArchiveChapter, ContactChapter,
} from "../journey/Chapters.jsx";
import { ProfileSection, AchievementsSection, LeadershipSection, WorkshopsSection } from "../journey/Dossier.jsx";

// three.js + the scene are loaded only in the browser (never part of the pre-rendered HTML or the main bundle).
// The download starts as soon as the app boots — in parallel with hydration — instead of after it; lazy() reuses
// the same module promise, so nothing is fetched twice. Skipped on the server and where WebGL does not exist.
const loadStage = () => import("../journey/Stage.jsx");
const Stage = lazy(loadStage);
if (typeof window !== "undefined" && "WebGLRenderingContext" in window) loadStage();

class StageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Home: one continuous journey — room → evidence → profile & achievements → transformation → archive → contact. */
export default function Home() {
  const { mode, onReady, onFail } = useJourney();
  const [mountStage, setMountStage] = useState(false);

  // Start loading the 3D stage after first paint, unless we're in calm mode.
  useEffect(() => {
    if (mode === "calm") return;
    const id = requestAnimationFrame(() => setMountStage(true));
    return () => cancelAnimationFrame(id);
  }, [mode]);

  return (
    <>
      <div className="stage" aria-hidden="true">
        {mountStage && mode !== "calm" && (
          <StageBoundary onFail={onFail}>
            <Suspense fallback={null}>
              <Stage onReady={onReady} onFail={onFail} />
            </Suspense>
          </StageBoundary>
        )}
      </div>
      <main id="main" tabIndex={-1} className="journey">
        <RoomChapter />
        <EvidenceChapter />
        {/* Normal-flow sections (not chapters): the camera holds on the table while they scroll past. */}
        <ProfileSection />
        <AchievementsSection />
        <LeadershipSection />
        <WorkshopsSection />
        <TransformChapter />
        <ArchiveChapter />
        <ContactChapter />
      </main>
    </>
  );
}
