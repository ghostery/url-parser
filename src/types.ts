import type { URL as IURL } from 'url';

export type { URLSearchParams as IURLSearchParams } from 'url';

export type IURLExtended = IURL & {
  slashes: string;
  origin: string;
};
