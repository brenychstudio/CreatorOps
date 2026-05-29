// src/app/routes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Marketing from "../pages/Marketing";
import Story from "../pages/Story";

import PrototypeShell from "../pages/prototype/PrototypeShell";
import Library from "../pages/prototype/Library";
import SmartMix from "../pages/prototype/SmartMix";
import Planner from "../pages/prototype/Planner";
import Captions from "../pages/prototype/Captions";
import ExportPage from "../pages/prototype/Export";
import BioBuilder from "../pages/prototype/BioBuilder";
import AppCrashBoundary from "../components/system/AppCrashBoundary";

export default function AppRoutes() {
  return (
    <AppCrashBoundary>
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/story" element={<Story />} />

        <Route path="/prototype" element={<PrototypeShell />}>
          <Route index element={<Navigate to="library" replace />} />
          <Route path="library" element={<Library />} />
          <Route path="smart-mix" element={<SmartMix />} />
          <Route path="sequence" element={<Navigate to="/prototype/planner" replace />} />
          <Route path="planner" element={<Planner />} />
          <Route path="captions" element={<Captions />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="bio-builder" element={<BioBuilder />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppCrashBoundary>
  );
}
