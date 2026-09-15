import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import MaterialLibraryPage from "@/pages/MaterialLibraryPage/MaterialLibraryPage";
import MaterialDetailPage from "@/pages/MaterialDetailPage/MaterialDetailPage";
import ScriptLibraryPage from "@/pages/ScriptLibraryPage/ScriptLibraryPage";
import ScriptDetailPage from "@/pages/ScriptDetailPage/ScriptDetailPage";
import TaskLibraryPage from "@/pages/TaskLibraryPage/TaskLibraryPage";
import TaskDetailPage from "@/pages/TaskDetailPage/TaskDetailPage";
import VideoLibraryPage from "@/pages/VideoLibraryPage/VideoLibraryPage";
import PromptTemplatePage from "@/pages/PromptTemplatePage/PromptTemplatePage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="materials" element={<MaterialLibraryPage />} />
        <Route path="materials/:id" element={<MaterialDetailPage />} />
        <Route path="scripts" element={<ScriptLibraryPage />} />
        <Route path="scripts/:id" element={<ScriptDetailPage />} />
        <Route path="tasks" element={<TaskLibraryPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="videos" element={<VideoLibraryPage />} />
        <Route path="prompts" element={<PromptTemplatePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
