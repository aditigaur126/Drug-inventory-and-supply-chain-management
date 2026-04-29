import { getServerSideProps } from "./getServerSideProps";

export default async function validateSession() {
  const session = await getServerSideProps();
  if (!session || !session.user) {
    return { error: "Unauthorized", status: 401 };
  }
  const sessionUser = (session.user as any)?.user ?? session.user;
  const { id: userId, hospitalName, email } = sessionUser || {};
  if (!userId || !hospitalName) {
    return { error: "Invalid session data", status: 401 };
  }
  return { userId, hospitalName, email };
}
