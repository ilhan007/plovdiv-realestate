/* eslint-disable @typescript-eslint/no-explicit-any */
import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "ui5-shellbar": any;
      "ui5-card": any;
      "ui5-card-header": any;
      "ui5-input": any;
      "ui5-select": any;
      "ui5-option": any;
      "ui5-button": any;
      "ui5-label": any;
      "ui5-title": any;
      "ui5-tag": any;
      "ui5-link": any;
      "ui5-icon": any;
      "ui5-slider": any;
      "ui5-range-slider": any;
      "ui5-segmented-button": any;
      "ui5-segmented-button-item": any;
      "ui5-switch": any;
      "ui5-tab-container": any;
      "ui5-tab": any;
      "ui5-panel": any;
      "ui5-badge": any;
    }
  }
}
