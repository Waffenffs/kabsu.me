import { db } from "@/db";
import { isNull } from "drizzle-orm";
import Post from "./post";
import { auth, clerkClient } from "@clerk/nextjs";

export default async function Posts() {
  const { userId } = auth();
  const posts = await db.query.posts.findMany({
    where: (post) => isNull(post.deleted_at),
    orderBy: (post, { desc }) => desc(post.created_at),
    with: {
      user: true,
    },
  });

  const usersFromPosts = await clerkClient.users.getUserList({
    userId: posts.map((post) => post.user.id),
  });

  return (
    <div className="flex flex-col">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={{
            ...post,
            user: usersFromPosts.find((user) => user.id === post.user.id)!,
          }}
          userId={userId}
        />
      ))}
    </div>
  );
}
