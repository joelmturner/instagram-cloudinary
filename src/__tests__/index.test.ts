import { convertInstagramPostToCloudinaryEntity } from "..";
import { Post } from "../types";

describe("convertInstagramPostToCloudinaryEntity", () => {
  test("should return tags", () => {
    const actualTags = convertInstagramPostToCloudinaryEntity([
      {
        media_url:
          "https://scontent.cdninstagram.com/v/t51.2885-15/14723723_1223392157708064_776377207755898880_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=c4dd86&_nc_ohc=t6l68UnmUL8AX-fmtVk&_nc_ht=scontent.cdninstagram.com&edm=AM6HXa8EAAAA&oh=00_AfB-M1t6EkWn6WpUzPjbEzE2XiaCPD84Xb5REAxButfEVw&oe=654E79F9",
        caption:
          "I'm so excited that @handletteredabcs is back! If you're interested in trying out your lettering with an encouraging and supportive community please feel free to join the #handletteredabcs challenge.\n\nThis time through I'm going to stick with the same style so I come out with a font.\n\n#joelmturner_featured",
        media_type: "IMAGE",
        timestamp: "2017-02-01T18:20:22+0000",
        username: "joelmturner",
        permalink: "https://www.instagram.com/p/BP-pO21hlS2/",
        comments: {
          data: [
            {
              text: "Thanks @dreamcatcher.design!",
              id: "17859631354126521",
            },
            {
              text: "SIMPLY STUNNING!",
              id: "17870865667043253",
            },
            {
              text: "#typography #handlettering #type #typedesign #lettering #sketch #goodtype #typegang #thedailytype #typelove #letterpdx #designspiration #handletteredABCs  #handletteredabcs_2017 #abcs_a #joelmturner_abcs2017",
              id: "17848153282157338",
            },
          ],
        },
        id: "17860264180107264",
      },
    ] as unknown as Post[])?.[0]?.tags;
    expect(actualTags).toEqual([
      "joelmturner_abcs2017",
      "joelmturner_featured",
    ]);
  });
});
