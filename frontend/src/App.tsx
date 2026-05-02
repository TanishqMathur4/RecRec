import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/home"
          element={
            <div className="p-8 text-2xl font-bold">
              Macro-Match Recipes — coming soon
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
