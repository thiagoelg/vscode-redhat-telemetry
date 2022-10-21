import { Logger } from "./logger";
import { getExtensionId } from "./extensions";
import { env, UIKind, window as vscodeWindow } from "vscode";
import {
  SegmentEvent,
  EventProperties,
  Callback,
  Options,
  Context,
} from "@segment/analytics-next";

// Browser polyfill
let window;
if (env.uiKind === UIKind.Web) {
  window = global.window;
  global.Buffer = global.Buffer || require('buffer').Buffer;
  global.process = require('process/browser');
}

const IS_DEBUG = startedInDebugMode();

let DEFAULT_SEGMENT_KEY: string | undefined;

type IntegrationValue = boolean | { [integration_key: string]: any };

type Identity =
  | { userId: string | number }
  | { userId?: string | number; anonymousId: string | number };

interface Integrations {
  [integration_name: string]: IntegrationValue;
}

export type AnalyticsType = {
  identify(
    message: Identity & {
      traits?: any;
      timestamp?: Date;
      context?: any;
      integrations?: Integrations;
    },
    callback?: (err: Error) => void
  ): void;

  track(
    message: Identity & {
      event: string;
      properties?: any;
      timestamp?: Date;
      context?: any;
      integrations?: Integrations;
    },
    callback?: (err: Error) => void
  ): void;

  track(
    eventName: string | SegmentEvent,
    properties?: EventProperties | Callback,
    options?: Options | Callback,
    callback?: Callback
  ): Promise<Context>;

  page(category?: string | object,
    name?: string | object | Callback,
    properties?: EventProperties | Options | Callback | null,
    options?: Options | Callback,
    callback?: Callback): Promise<Context>;

  page(message: Identity & {
    category?: string;
    name?: string;
    properties?: any;
    timestamp?: Date;
    context?: any;
    integrations?: Integrations;
  }, callback?: (err: Error) => void): void;

  flush?(): void;
};

export namespace SegmentInitializer {
  export async function initialize(
    clientPackageJson: any
  ): Promise<AnalyticsType | undefined> {
    let segmentWriteKey = getSegmentKey(clientPackageJson);
    if (!segmentWriteKey) {
      //Using the default key
      if (!DEFAULT_SEGMENT_KEY) {
        const defaultPackageJson = require("../../package.json");
        DEFAULT_SEGMENT_KEY = getSegmentKey(defaultPackageJson);
      }
      segmentWriteKey = DEFAULT_SEGMENT_KEY;
    }

    if (segmentWriteKey) {
      /* 
        flushAt: Number ->  The number of messages to enqueue before flushing.
        flushInterval: Number ->    The number of milliseconds to wait before flushing the queue automatically.
        ref: https://segment.com/docs/connections/sources/catalog/libraries/server/node/#configuration
        */
      let analytics;
      let analyticsModule;
      if (env.uiKind === UIKind.Desktop) {
        analyticsModule = await import("analytics-node");
        analytics = new analyticsModule.default(segmentWriteKey, {
          flushAt: 10,
          flushInterval: 10000,
        });
      } else {
        analyticsModule = await import("@segment/analytics-next");
        analytics = analyticsModule.AnalyticsBrowser.load({
          writeKey: segmentWriteKey,
        });
      }
      return analytics as AnalyticsType;
    } else {
      Logger.log(
        "Missing segmentWriteKey from package.json OR package.json in vscode-commons"
      );
      return undefined;
    }
  }
}

function startedInDebugMode(): boolean {
  if (typeof process !== 'undefined') {
    const args = (process as any)?.execArgv as string[] || [];
    return hasDebugFlag(args);
  }
  return false;
}

// exported for tests
function hasDebugFlag(args: string[]): boolean {
  return (
    args &&
    // See https://nodejs.org/en/docs/guides/debugging-getting-started/
    args.some((arg) => /^--inspect/.test(arg) || /^--debug/.test(arg))
  );
}

function getSegmentKey(packageJson: any): string | undefined {
  const extensionId = getExtensionId(packageJson);
  let keyKey = "segmentWriteKeyDebug";
  try {
    let clientSegmentKey: string | undefined = undefined;
    if (IS_DEBUG) {
      clientSegmentKey = packageJson[keyKey];
    } else {
      keyKey = "segmentWriteKey";
      clientSegmentKey = packageJson[keyKey];
    }
    if (clientSegmentKey) {
      Logger.log(`'${extensionId}' ${keyKey} : ${clientSegmentKey}`);
    }
    return clientSegmentKey;
  } catch (error) {
    Logger.log(`Unable to get '${extensionId}' ${keyKey}: ${error}`);
  }
  return undefined;
}
