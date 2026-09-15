import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import SearchPage from './pages/Search/SearchPage';
import AnalyzePage from './pages/Analyze/AnalyzePage';
import ScriptPage from './pages/Script/ScriptPage';
import ProducePage from './pages/Produce/ProducePage';
import ProjectPage from './pages/Project/ProjectPage';
import GenePage from './pages/Gene/GenePage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SearchPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="script" element={<ScriptPage />} />
        <Route path="produce" element={<ProducePage />} />
        <Route path="project" element={<ProjectPage />} />
        <Route path="gene" element={<GenePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
