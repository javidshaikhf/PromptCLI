import React from "react";
import ReactDOM from "react-dom/client";
import "@xterm/xterm/css/xterm.css";
import "./styles/global.css";
import { App } from "./app/App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
