export interface UnityAssetData {
    url: string;
    title: string | null;
    price: string | null;
    publisher: string | null;
    releaseDate: string | null;
    fileSize: string | null;
    description: string | null;
    images: string[];
    videos: string[];
}
