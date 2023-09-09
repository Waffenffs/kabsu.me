"use server";

import { POST_TYPE_TABS } from "@/lib/constants";
import { db } from "@/db";
import {
  Campus,
  College,
  Follower,
  Post,
  posts,
  Program,
  User,
} from "@/db/schema";
import { CreatePostSchema, UpdatePostSchema } from "@/zod-schema/post";
import { auth } from "@clerk/nextjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

export async function getPosts({
  type,
  page,
}: {
  type: (typeof POST_TYPE_TABS)[number]["id"];
  page: number;
}) {
  const { userId } = auth();

  if (!userId) throw new Error("Unauthorized");

  let posts: (Post & {
    user: User & {
      program: Program & { college: College & { campus: Campus } };
    };
  })[] = [];

  if (type === "all") {
    posts = await db.query.posts.findMany({
      where: (post, { isNull }) => isNull(post.deleted_at),

      orderBy: (post, { desc }) => desc(post.created_at),
      limit: 10,
      offset: (page - 1) * 10,

      with: {
        user: {
          with: {
            program: {
              with: {
                college: {
                  with: {
                    campus: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } else if (type === "program") {
    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
      orderBy: (post, { desc }) => desc(post.created_at),
      with: {
        program: true,
      },
    });

    if (!user) throw new Error("User not found");

    const usersInPrograms: User[] = await db.query.users.findMany({
      where: (userInDB, { eq }) => eq(userInDB.program_id, user.program_id),
    });

    posts = await db.query.posts.findMany({
      where: (post, { or, and, eq, isNull, inArray }) =>
        or(
          and(
            isNull(post.deleted_at),
            usersInPrograms.length > 0
              ? inArray(
                  post.user_id,
                  usersInPrograms.map((f) => f.id),
                )
              : undefined,
          ),
          eq(post.user_id, userId),
        ),
      orderBy: (post, { desc }) => desc(post.created_at),
      limit: 10,
      offset: (page - 1) * 10,
      with: {
        user: {
          with: {
            program: {
              with: {
                college: {
                  with: {
                    campus: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } else if (type === "college") {
    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
      with: {
        program: true,
      },
    });

    if (!user) throw new Error("User not found");

    const usersInPrograms: User[] = await db.query.users.findMany({
      where: (userInDB, { eq }) => eq(userInDB.program_id, user.program_id),
    });

    const colleges = await db.query.programs.findMany({
      where: (program, { eq }) =>
        eq(program.college_id, user.program.college_id),
    });

    const usersInColleges: User[] =
      colleges.length > 0
        ? await db.query.users.findMany({
            where: (userInDB, { inArray }) =>
              inArray(
                userInDB.program_id,
                colleges.map((c) => c.id),
              ),
          })
        : [];

    posts = await db.query.posts.findMany({
      where: (post, { or, and, eq, isNull, inArray }) =>
        or(
          and(
            isNull(post.deleted_at),
            usersInPrograms.length > 0
              ? inArray(
                  post.user_id,
                  usersInColleges.map((f) => f.id),
                )
              : undefined,
          ),
          eq(post.user_id, userId),
        ),
      limit: 10,
      offset: (page - 1) * 10,
      orderBy: (post, { desc }) => desc(post.created_at),
      with: {
        user: {
          with: {
            program: {
              with: {
                college: {
                  with: {
                    campus: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    // } else if (type === "campus") {
    //   const user = await db.query.users.findFirst({
    //     where: (user, { eq }) => eq(user.id, userId),
    //     with: {
    //       program: {
    //         with: {
    //           college: true,
    //         },
    //       },
    //     },
    //   });

    //   if (!user) throw new Error("User not found");

    //   const usersInPrograms: User[] = await db.query.users.findMany({
    //     where: (userInDB, { eq }) => eq(userInDB.program_id, user.program_id),
    //   });

    //   const colleges = await db.query.programs.findMany({
    //     where: (program, { eq }) =>
    //       eq(program.college_id, user.program.college_id),
    //   });

    //   const usersInColleges: User[] =
    //     colleges.length > 0
    //       ? await db.query.users.findMany({
    //           where: (userInDB, { inArray }) =>
    //             inArray(
    //               userInDB.program_id,
    //               colleges.map((c) => c.id),
    //             ),
    //         })
    //       : [];

    //   posts = await db.query.posts.findMany({
    //     where: (post, { or, and, eq, isNull, inArray }) =>
    //       or(
    //         and(
    //           isNull(post.deleted_at),
    //           usersInPrograms.length > 0
    //             ? inArray(
    //                 post.user_id,
    //                 usersInColleges.map((f) => f.id),
    //               )
    //             : undefined,
    //         ),
    //         eq(post.user_id, userId),
    //       ),
    //     limit: 10,
    //     offset: (page - 1) * 10,
    //     orderBy: (post, { desc }) => desc(post.created_at),
    //     with: {
    //       user: {
    //         with: {
    //           program: {
    //             with: {
    //               college: {
    //                 with: {
    //                   campus: true,
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   });
  } else if (type === "following") {
    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
      with: {
        program: {
          with: {
            college: {
              with: {
                campus: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new Error("User not found");

    const following: Follower[] = await db.query.followers.findMany({
      where: (follower, { eq }) => eq(follower.follower_id, userId),
    });

    posts = await db.query.posts.findMany({
      where: (post, { or, and, eq, isNull, inArray }) =>
        and(
          isNull(post.deleted_at),
          or(
            following.length > 0
              ? inArray(
                  post.user_id,
                  following.map((f) => f.followee_id),
                )
              : undefined,
            eq(post.user_id, userId),
          ),
        ),

      limit: 10,
      offset: (page - 1) * 10,
      orderBy: (post, { desc }) => desc(post.created_at),
      with: {
        user: {
          with: {
            program: {
              with: {
                college: {
                  with: {
                    campus: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  const usersFromPosts = await clerkClient.users.getUserList({
    userId: posts.map((post) => post.user && post.user.id),
  });

  const returnPosts = posts.map((post) => ({
    ...post,
    user: {
      ...post.user,
      ...usersFromPosts.find((user) => user.id === post.user.id)!,
    },
  }));

  return returnPosts;
}

export async function createPost({ content }: CreatePostSchema) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(posts).values({ content, user_id: userId });

  revalidatePath("/");
}
export async function deletePost({ post_id }: { post_id: string }) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const post = await db.query.posts.findFirst({
    where: (posts, { and, eq }) =>
      and(eq(posts.id, post_id), eq(posts.user_id, userId)),
  });

  if (!post) throw new Error("Post not found");

  await db
    .update(posts)
    .set({ deleted_at: new Date() })
    .where(and(eq(posts.id, post_id), eq(posts.user_id, userId)));

  revalidatePath("/");
}

export async function updatePost({ content, post_id }: UpdatePostSchema) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const postFromDB = await db.query.posts.findFirst({
    where: (posts, { and, eq }) =>
      and(eq(posts.id, post_id), eq(posts.user_id, userId)),
  });

  if (!postFromDB) throw new Error("Post not found");

  await db
    .update(posts)
    .set({ content })
    .where(and(eq(posts.id, post_id), eq(posts.user_id, userId)));

  revalidatePath("/");
}
