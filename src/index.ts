import axios from "axios";
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

async function sendToCloudinary(postGroup: UploadPost[]) {
  console.log("🚀 uploading to Cloudinary");
  const resolves = postGroup.map(
    async ({ public_id, folder, overwrite, tags, url }) => {
      try {
        return new Promise((resolve, reject) => {
          cloudinary.v2.uploader.upload(
            url,
            {
              public_id,
              folder,
              overwrite,
              tags,
            },
            function (error) {
              if (error) {
                reject(error);
              } else {
                resolve("SUCCESS");
              }
            }
          );
        });
      } catch (error_1) {
        console.log("😿 Cloudinary upload error", error_1);
      }
    }
  );

  // make sure all were successful
  const successfullyResolved = (await Promise.all(resolves)).every(
    resolve => !!resolve
  );

  return successfullyResolved ? "SUCCESS" : "ERROR";
}

async function fetchInstagramPosts(postRequestError: null | unknown) {
  try {
    console.log("🚀 fetching Instagram posts");
    const response = await axios.get<InstagramResponse>(
      `https://graph.facebook.com/v12.0/${process.env.INSTAGRAM_ID}/media?fields=media_url,caption,media_type,timestamp,username,children{media_url},permalink,comments.limit(3){text}&limit=${MAX_POSTS}&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
    );
    return response?.data?.data;
  } catch (error) {
    postRequestError = error;
    console.log("😿 Instagram fetch error", error);
  }
}

function convertInstagramPostToCloudinaryEntity(posts: Post[]): UploadPost[] {
  console.log("🚀 converting posts to Cloudinary");
  const cloudinaryCollection: UploadPost[] = [];

  // check for hashtags in the posts and add to collection
  HASHTAG_CONFIG.forEach(config => {
    const postGroup = posts?.filter(post => {
      // making sure the post is an image instead of video
      if (!["IMAGE", "CAROUSEL_ALBUM"].includes(post.media_type)) {
        return false;
      }
      // combines the text from the first 3 comments
      const comments =
        post?.comments?.data?.reduce((acc, comment) => {
          acc = `${acc} ${comment?.text}`;
          return acc;
        }, "") ?? "";

      const content = `${post?.caption} ${comments}`;
      // check to see if our regex matches anything in the combined string
      return content.match(config.regex);
    });

    // loop over the posts and add to stored variable
    if (postGroup?.length) {
      postGroup.forEach(post => {
        const timestamp = new Date(post.timestamp).valueOf();
        // using a date value as id so it's easier to sort by date
        const combinedId = `${timestamp}_${post.id}`;
        // see if this post is already in our collection
        const found = cloudinaryCollection.find(
          uploadPost => uploadPost.public_id === combinedId
        );

        const url =
          post.media_type === "CAROUSEL_ALBUM"
            ? post.children?.data[0].media_url ?? post.media_url
            : post.media_url;

        if (found) {
          // combine tags on the entity
          console.log("📸 adding new tags");
          found.tags = [...new Set(...found.tags, config.id)];
        } else {
          //   console.log("📸 adding a new image to Cloudinary");
          // create entity
          cloudinaryCollection.push({
            url,
            public_id: combinedId,
            folder: "illustration",
            overwrite: true,
            tags: [config.id],
            createdDate: timestamp,
          });
        }
      });
    }
  });

  return cloudinaryCollection;
}

export async function instagramToCloudinary() {
  let postRequestError = null;

  // fetch the posts from Instagram
  const posts = await fetchInstagramPosts(postRequestError);

  let output = "NO POSTS";

  if (posts?.length) {
    // convert the posts by hashtags
    const cloudinaryCollection: UploadPost[] =
      convertInstagramPostToCloudinaryEntity(posts);

    // upload to Cloudinary
    const uploadStatus = await sendToCloudinary(cloudinaryCollection);

    // trigger a build if posts are pulled successfully
    if (!postRequestError && uploadStatus === "SUCCESS") {
      await axios
        .post(process.env.NETLIFY_WEBHOOK as string)
        .then(() => {
          console.log("🚀 triggered Netlify build");
          output = "SUCCESS";
        })
        .catch(error => {
          console.log("😿 Netlify trigger error", error);
          output = "ERROR";
        });
    } else {
      console.log("Not firing Netlify ", uploadStatus);
      output = "ERROR";
    }
  }

  return output;

  // for local debugging
  //   fs.writeFile("test.json", JSON.stringify(cloudinaryCollection, null, 2), (err: any) => {
  //     if (err) {
  //       console.error(err);
  //       return;
  //     }
  //     //file written successfully
  //   });
}

// fire the script
// instagramToCloudinary();
