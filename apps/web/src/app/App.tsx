import { useEffect } from "react";

export function App() {
  useEffect(() => {
    document.title = "G-Scores";
  }, []);

  return null;
}
