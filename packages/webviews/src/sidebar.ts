import { mount } from "svelte";
import "@vscode/codicons/dist/codicon.css";
import "./app.css";
import Sidebar from "./Sidebar.svelte";

const app = mount(Sidebar, {
  target: document.getElementById("app")!,
});

export default app;

