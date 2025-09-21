import type { UnityPublisher } from './unityPublisher.mjs';

export interface UnityAssetData {
    url: string;
    slug: string;
    title?: string;
    price?: string;
    publisher?: UnityPublisher;
    version?: string;
    releaseDate?: string;
    description?: string;
    images: string[];
    videos: string[];
}
