import { BuildTrackerService } from "./build-tracker.service";

export const createLogPlugin = (buildId: string, buildTracker: BuildTrackerService) => ({
  name: 'log-plugin',

  buildStart() {
    const msg = '[Rollup] build started';
    console.log(msg);
    buildTracker.appendLog(buildId, msg, 'info');
  },

  resolveId(source: string) {
    if (source.startsWith('.') || source.includes('node_modules')) {
      return null;
    }

    const msg = `[Resolve] ${source}`;
    buildTracker.appendLog(buildId, msg, 'debug');
    return null;
  },

  load(id: string) {
    const msg = `[Load] ${id}`;
    buildTracker.appendLog(buildId, msg, 'debug');
    return null;
  },
});