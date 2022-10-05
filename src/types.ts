export type Comment = {
  text: string;
  id: string;
};

export type Post = {
  media_url: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "AUDIO" | "CAROUSEL_ALBUM";
  timestamp: string;
  comments_count: number;
  id: string;
  comments?: {
    data: Comment[];
  };
  children?: {
    data: {media_url: string, id: string}[]
  }
};

export type PostConfig = {
  data: Post[];
};

export type UploadPost = {
  url: string;
  public_id: string;
  folder: string;
  overwrite: true;
  tags: string[];
  createdDate: number;
};

export type InstagramResponse = {
  paging: {
    next: string;
  };
  data: Post[];
};
