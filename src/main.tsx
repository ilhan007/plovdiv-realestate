import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// UI5 Web Components
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Tag.js";
import "@ui5/webcomponents/dist/Link.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/RangeSlider.js";
import "@ui5/webcomponents/dist/SegmentedButton.js";
import "@ui5/webcomponents/dist/SegmentedButtonItem.js";
import "@ui5/webcomponents/dist/Switch.js";
import "@ui5/webcomponents/dist/TabContainer.js";
import "@ui5/webcomponents/dist/Tab.js";
import "@ui5/webcomponents/dist/Panel.js";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/building.js";
import "@ui5/webcomponents-icons/dist/filter.js";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import "@ui5/webcomponents-icons/dist/money-bills.js";
import "@ui5/webcomponents-icons/dist/map.js";
import "@ui5/webcomponents-icons/dist/globe.js";
import "@ui5/webcomponents-icons/dist/reset.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
