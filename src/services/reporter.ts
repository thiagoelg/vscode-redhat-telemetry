import { AnalyticsBrowser } from  '@segment/analytics-next';
import { CacheService } from '../interfaces/cacheService';
import { Environment } from '../interfaces/environment';
import { IdManager } from '../interfaces/idManager';
import { TelemetryEvent } from '../interfaces/telemetry';
import { enhance } from '../utils/events';
import { Logger } from '../utils/logger';
import { sha1 } from 'object-hash';
import { AnalyticsType } from '../utils/segmentInitializer';
import { env, UIKind } from "vscode";

/**
 * Sends Telemetry events to a segment.io backend
 */
export class Reporter {
  private analytics: AnalyticsType | undefined;
  private idManager: IdManager;
  private environment: Environment;
  private cacheService?: CacheService;
  private isBrowser: boolean = false;

  constructor(analytics: AnalyticsType | undefined, idManager: IdManager, environment: Environment, cacheService?: CacheService) {
    this.analytics = analytics;
    this.idManager = idManager;
    this.environment = environment;
    this.cacheService = cacheService;
    this.isBrowser = env.uiKind === UIKind.Web;
  }

    
  public async report(event: TelemetryEvent): Promise<void> {
    if (this.analytics) {
      event = enhance(event, this.environment);

      let payload = {
        userId: await this.idManager.getRedHatUUID(),
        event: event.name,
        properties: event.properties,
        measures: event.measures,
        traits: event.traits,
        context: event.context
      };
      const type = (event.type) ? event.type : 'track';
      const payloadString = JSON.stringify(payload);
      switch (type) {
        case 'identify':
          //Avoid identifying the user several times, until some data has changed.
          const hash = sha1(payloadString);
          const cached = await this.cacheService?.get('identify');
          if (hash === cached) {
            Logger.log(`Skipping 'identify' event! Already sent:\n${payloadString}`);
            return;
          }
          Logger.log(`Sending 'identify' event with\n${payloadString}`);
          this.analytics?.identify(payload);
          this.cacheService?.put('identify', hash);
          break;
        case 'track':
          Logger.log(`Sending 'track' event with\n${payloadString}`);
          if (!this.isBrowser) {
            this.analytics?.track(payload);
          } else {
            this.analytics?.track(payload.event, payload.properties)
          }
          break;
        case 'page':
          Logger.log(`Sending 'page' event with\n${payloadString}`);
          this.analytics?.page(payload);
          break;
        default:
          Logger.log(`Skipping unsupported (yet?) '${type}' event with\n${payloadString}`);
          break;
      }
    }
  }

  public async flush(): Promise<void> {
    this.analytics?.flush?.();
  }
}
