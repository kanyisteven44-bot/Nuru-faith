import { z } from "zod";
const snippet = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  channelId: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnails: z.record(z.string(), z.object({ url: z.string() })).optional(),
});
export const response = z.object({
  nextPageToken: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: snippet.optional(),
        statistics: z
          .object({
            likeCount: z.string().optional(),
            commentCount: z.string().optional(),
            viewCount: z.string().optional(),
            subscriberCount: z.string().optional(),
            hiddenSubscriberCount: z.boolean().optional(),
          })
          .optional(),
        contentDetails: z
          .object({
            relatedPlaylists: z.object({ uploads: z.string().optional() }).optional(),
            videoId: z.string().optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});
export const commentsResponse = z.object({
  nextPageToken: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          totalReplyCount: z.number(),
          topLevelComment: z.object({
            snippet: z.object({
              authorDisplayName: z.string(),
              authorProfileImageUrl: z.string(),
              textDisplay: z.string(),
              likeCount: z.number(),
              publishedAt: z.string(),
            }),
          }),
        }),
      }),
    )
    .default([]),
});
