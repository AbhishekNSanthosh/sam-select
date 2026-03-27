export interface IEvent {
  _id: string;
  name: string;
  clientName: string;
  eventDate: string;
  pin: string;
  shareToken: string;
  description?: string;
  coverPhoto?: string;
  status: "active" | "locked" | "archived";
  totalPhotos: number;
  minSelection?: number;
  maxSelection?: number;
  allowDownload?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPhoto {
  _id: string;
  eventId: string;
  driveFileId: string;
  thumbnailUrl: string;
  fullUrl: string;
  filename: string;
  width?: number;
  height?: number;
  isBlurry?: boolean;
  popularity: number;
  category?: string;
  createdAt: string;
}

export interface IAlbum {
  _id: string;
  eventId: string;
  selectedPhotoIds: string[];
  status: "draft" | "submitted" | "approved" | "changes_requested";
  submittedAt?: string;
  adminNotes?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISession {
  eventId: string;
  eventName: string;
  clientName: string;
  albumId?: string;
  albumStatus?: IAlbum["status"];
  expiresAt: number;
}
