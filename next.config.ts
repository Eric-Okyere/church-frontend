import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Pins the workspace root explicitly so Turbopack never walks up past
  // this folder looking for a lockfile/.git repo — without this, a stray
  // package-lock.json or .git in a parent directory (e.g. the user's home
  // folder) gets misdetected as the project root, which silently breaks
  // module resolution for every dependency. See the project doc's
  // "Post-deployment issues" #20 for the full story.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
