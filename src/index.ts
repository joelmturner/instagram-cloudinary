import axios, { AxiosResponse } from "axios";
import cloudinary from "cloudinary";
import { HASHTAG_CONFIG, MAX_POSTS } from "./constants";
import { InstagramResponse, Post, UploadPost } from "./types";

require("dotenv").config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function sendToCloudinary(postGroup: UploadPost[]): void {
  postGroup.forEach(({ public_id, folder, overwrite, tags, url }) => {
    cloudinary.v2.uploader.upload(
      url,
      {
        public_id,
        folder,
        overwrite,
        tags,
      },
      function (error, result) {
        console.log(result, error);
      }
    );
  });
}

async function transform() {
  // fetch the posts from Instagram
  const posts = await axios
    .get<InstagramResponse>(
      `https://graph.facebook.com/v12.0/${process.env.INSTAGRAM_ID}/media?fields=media_url,thumbnail_url,caption,media_type,like_count,shortcode,timestamp,comments_count,username,children{media_url},permalink,comments.limit(3){text}&limit=${MAX_POSTS}&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
    )
    .then(async (response: AxiosResponse<InstagramResponse> | null | void) => {
      const responseData = response?.data;
      if (!responseData) {
        return;
      }
      const results: Post[] = [];
      results.push(...responseData?.data);
      const promises: any[] = [];
      /**
       * If maxPosts option specified, then check if there is a next field in the response data and the results' length <= maxPosts
       * otherwise, fetch as more as it can.
       */
      while (responseData?.paging.next && results.length <= MAX_POSTS) {
        promises.push(await axios(responseData.paging.next));
      }
      Promise.all(promises).then((responses) =>
        responses.forEach((response) => results.push(response?.data))
      );
      return results;
    })
    .catch((error) => console.log(error));

  const cloudinaryCollection: UploadPost[] = [];

  // check for hashtags in the posts and add to contents
  HASHTAG_CONFIG.forEach((config) => {
    const postGroup = posts?.filter((post) => {
      const comments =
        post?.comments?.data?.reduce((acc, comment) => {
          acc = `${acc} ${comment?.text}`;
          return acc;
        }, "") ?? "";

      const content = `${post?.caption} ${comments}`;
      return content.match(config.regex);
    });

    if (postGroup?.length) {
      postGroup.forEach((post) => {
        const found = cloudinaryCollection.find((uploadPost) => uploadPost.public_id === post.id);
        if (found) {
          found.tags = [...found.tags, config.id];
        } else {
          const timestamp = new Date(post.timestamp).valueOf();

          cloudinaryCollection.push({
            url: post.media_url,
            public_id: `${timestamp}`,
            folder: "illustration",
            overwrite: true,
            tags: [config.id],
            createdDate: timestamp,
          });
        }
      });
    }
  });

  cloudinaryCollection.sort((a, b) => a.createdDate - b.createdDate);
  sendToCloudinary(cloudinaryCollection);

  //   fs.writeFile("test.json", JSON.stringify(cloudinaryCollection, null, 2), (err: any) => {
  //     if (err) {
  //       console.error(err);
  //       return;
  //     }
  //     //file written successfully
  //   });
}

transform();
