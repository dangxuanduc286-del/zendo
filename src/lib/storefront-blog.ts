export interface StorefrontPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: { main: string; sub: string[] } | null;
  tags: string[];
  publishedAt: Date;
  updatedAt: Date;
}


