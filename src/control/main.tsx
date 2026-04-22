import { createRoot } from "react-dom/client";
import "../index.css";
import { App } from "./App";
import { TooltipProvider } from "@shared/components/ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>
);
