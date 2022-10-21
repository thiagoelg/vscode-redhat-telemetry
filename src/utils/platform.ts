import { Environment } from '..';
import { PlatformWeb } from './platform-web';
import { PlatformNode } from './platform-node';
import { env, UIKind } from 'vscode';

export type Platform = {
  getEnvironment(extensionId: string, extensionVersion:string): Promise<Environment>
}

export const platform: Platform = env.uiKind === UIKind.Web ? PlatformWeb : PlatformNode;