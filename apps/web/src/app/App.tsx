import { useEffect } from "react";

export function App() {
  useEffect(() => {
    document.title = "G-Scores";
  }, []);

  return <div>G-Scores</div>;
}
