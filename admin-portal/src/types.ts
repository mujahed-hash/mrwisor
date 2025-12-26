export interface Ad {
    id: string;
    title: string;
    content: string;
    type: 'TOP_BANNER' | 'BOTTOM_STICKY' | 'FEED';
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
}
