import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-fundraiser-bar",
  description: "Live fundraiser thermometer toward a goal, no payments, mesh-synced tracking",
  accentHex: "#e07a5f",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
