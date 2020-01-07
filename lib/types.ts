import { URL as IURL } from 'url';

export { URLSearchParams as IURLSearchParams } from 'url';

export type IURLExtended = IURL & {
    slashes: string;
    origin: string;
};
